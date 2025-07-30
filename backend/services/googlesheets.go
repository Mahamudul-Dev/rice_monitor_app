package services

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"google.golang.org/api/iterator"
	"google.golang.org/api/sheets/v4"

	"rice-monitor-api/models"
)

type GoogleSheetsService struct {
	srv          *sheets.Service
	ctx          context.Context
	firestoreSvc *FirestoreService
}

func NewGoogleSheetsService(firestoreSvc *FirestoreService) (*GoogleSheetsService, error) {
	ctx := context.Background()

	srv, err := sheets.NewService(ctx)
	if err != nil {
		return nil, fmt.Errorf("unable to retrieve Sheets client: %v", err)
	}

	gs := &GoogleSheetsService{
		srv:          srv,
		ctx:          ctx,
		firestoreSvc: firestoreSvc,
	}

	// Ensure headers are present in all sheets
	err = gs.ensureAllHeaders()
	if err != nil {
		return nil, fmt.Errorf("failed to ensure headers in Google Sheets: %v", err)
	}

	return gs, nil
}

func (gs *GoogleSheetsService) fetchSheets() ([]models.Sheet, error) {
	iter := gs.firestoreSvc.Sheets().Documents(gs.ctx)
	var sheets []models.Sheet
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("failed to iterate sheets: %v", err)
		}
		var sheet models.Sheet
		if err := doc.DataTo(&sheet); err != nil {
			log.Printf("failed to decode sheet document: %v", err)
			continue
		}
		sheets = append(sheets, sheet)
	}
	return sheets, nil
}

func (gs *GoogleSheetsService) ensureAllHeaders() error {
	sheets, err := gs.fetchSheets()
	if err != nil {
		return err
	}

	for _, sheet := range sheets {
		err := gs.ensureHeaders(sheet.SpreadsheetID, sheet.SpreadsheetName)
		if err != nil {
			log.Printf("failed to ensure headers for sheet %s (%s): %v", sheet.SpreadsheetName, sheet.SpreadsheetID, err)
		}
	}
	return nil
}

func (gs *GoogleSheetsService) ensureHeaders(spreadsheetID, sheetName string) error {
	readRange := fmt.Sprintf("'%s'!A1:A1", sheetName)
	resp, err := gs.srv.Spreadsheets.Values.Get(spreadsheetID, readRange).Do()
	if err != nil {
		return fmt.Errorf("unable to retrieve data from sheet: %v", err)
	}

	if len(resp.Values) == 0 || len(resp.Values[0]) == 0 || resp.Values[0][0] == "" {
		headers := []interface{}{
			"ID", "UserID", "FieldID", "FieldName", "Date", "GrowthStage",
			"Notes", "ObserverName", "Status", "CreatedAt", "UpdatedAt",
			"Latitude", "Longitude",
			"CulmLength", "PanicleLength", "PaniclesPerHill", "HillsObserved",
			"Healthy", "Unhealthy", "SignsOfPestInfestation", "PestDetails", "OtherPest",
			"SignsOfNutrientDeficiency", "NutrientDeficiencyDetails", "OtherNutrient",
			"WaterStress", "WaterStressLevel", "Lodging", "LodgingLevel",
			"WeedInfestation", "WeedInfestationLevel", "DiseaseSymptoms", "DiseaseDetails", "OtherDisease",
			"Other", "OtherConditionText",
			"Images", "Videos", "Audio",
		}
		valueRange := &sheets.ValueRange{
			Values: [][]interface{}{headers},
		}

		_, err := gs.srv.Spreadsheets.Values.Update(spreadsheetID, fmt.Sprintf("'%s'!A1", sheetName), valueRange).ValueInputOption("RAW").Do()
		if err != nil {
			return fmt.Errorf("unable to write headers to sheet: %v", err)
		}
		log.Printf("Google Sheet headers written successfully for %s.", sheetName)
	} else {
		log.Printf("Google Sheet headers already exist for %s.", sheetName)
	}
	return nil
}

func (gs *GoogleSheetsService) AppendSubmission(submission *models.Submission, fieldName string) error {
	sh, err := gs.fetchSheets()
	if err != nil {
		return err
	}

	row := gs.submissionToRow(submission, fieldName)
	valueRange := &sheets.ValueRange{
		Values: [][]interface{}{row},
	}

	for _, sheet := range sh {
		_, err := gs.srv.Spreadsheets.Values.Append(sheet.SpreadsheetID, fmt.Sprintf("'%s'!A:A", sheet.SpreadsheetName), valueRange).ValueInputOption("RAW").Do()
		if err != nil {
			log.Printf("unable to append data to sheet %s (%s): %v", sheet.SpreadsheetName, sheet.SpreadsheetID, err)
		} else {
			log.Printf("Appended submission %s to Google Sheet %s.", submission.ID, sheet.SpreadsheetName)
		}
	}
	return nil
}

func (gs *GoogleSheetsService) UpdateSubmission(submission *models.Submission, fieldName string) error {
	sh, err := gs.fetchSheets()
	if err != nil {
		return err
	}

	for _, sheet := range sh {
		readRange := fmt.Sprintf("'%s'!A:A", sheet.SpreadsheetName)
		resp, err := gs.srv.Spreadsheets.Values.Get(sheet.SpreadsheetID, readRange).Do()
		if err != nil {
			log.Printf("unable to retrieve data from sheet %s for update: %v", sheet.SpreadsheetName, err)
			continue
		}

		rowIndex := -1
		for i, row := range resp.Values {
			if len(row) > 0 && row[0] == submission.ID {
				rowIndex = i
				break
			}
		}

		if rowIndex == -1 {
			log.Printf("Submission %s not found in Google Sheet %s for update, appending instead.", submission.ID, sheet.SpreadsheetName)
			gs.appendRow(sheet.SpreadsheetID, sheet.SpreadsheetName, gs.submissionToRow(submission, fieldName))
			continue
		}

		rowToUpdate := gs.submissionToRow(submission, fieldName)
		valueRange := &sheets.ValueRange{
			Values: [][]interface{}{rowToUpdate},
		}

		updateRange := fmt.Sprintf("'%s'!A%d", sheet.SpreadsheetName, rowIndex+1)
		_, err = gs.srv.Spreadsheets.Values.Update(sheet.SpreadsheetID, updateRange, valueRange).ValueInputOption("RAW").Do()
		if err != nil {
			log.Printf("unable to update data in sheet %s: %v", sheet.SpreadsheetName, err)
		} else {
			log.Printf("Updated submission %s in Google Sheet %s at row %d.", submission.ID, sheet.SpreadsheetName, rowIndex+1)
		}
	}
	return nil
}

func (gs *GoogleSheetsService) appendRow(spreadsheetID, sheetName string, row []interface{}) {
	valueRange := &sheets.ValueRange{
		Values: [][]interface{}{row},
	}
	_, err := gs.srv.Spreadsheets.Values.Append(spreadsheetID, fmt.Sprintf("'%s'!A:A", sheetName), valueRange).ValueInputOption("RAW").Do()
	if err != nil {
		log.Printf("unable to append row to sheet %s: %v", sheetName, err)
	}
}

func (gs *GoogleSheetsService) submissionToRow(submission *models.Submission, fieldName string) []interface{} {
	return []interface{}{
		submission.ID,
		submission.UserID,
		submission.FieldID,
		fieldName,
		submission.Date.Format(time.RFC3339),
		submission.GrowthStage,
		submission.Notes,
		submission.ObserverName,
		submission.Status,
		submission.CreatedAt.Format(time.RFC3339),
		submission.UpdatedAt.Format(time.RFC3339),
		fmt.Sprintf("%f", submission.Coordinates.Latitude),
		fmt.Sprintf("%f", submission.Coordinates.Longitude),
		fmt.Sprintf("%f", submission.TraitMeasurements.CulmLength),
		fmt.Sprintf("%f", submission.TraitMeasurements.PanicleLength),
		fmt.Sprintf("%d", submission.TraitMeasurements.PaniclesPerHill),
		fmt.Sprintf("%d", submission.TraitMeasurements.HillsObserved),
		fmt.Sprintf("%t", submission.PlantConditions.Healthy),
		fmt.Sprintf("%t", submission.PlantConditions.Unhealthy),
		fmt.Sprintf("%t", submission.PlantConditions.SignsOfPestInfestation),
		mapToString(submission.PlantConditions.PestDetails),
		submission.PlantConditions.OtherPest,
		fmt.Sprintf("%t", submission.PlantConditions.SignsOfNutrientDeficiency),
		mapToString(submission.PlantConditions.NutrientDeficiencyDetails),
		submission.PlantConditions.OtherNutrient,
		fmt.Sprintf("%t", submission.PlantConditions.WaterStress),
		submission.PlantConditions.WaterStressLevel,
		fmt.Sprintf("%t", submission.PlantConditions.Lodging),
		submission.PlantConditions.LodgingLevel,
		fmt.Sprintf("%t", submission.PlantConditions.WeedInfestation),
		submission.PlantConditions.WeedInfestationLevel,
		fmt.Sprintf("%t", submission.PlantConditions.DiseaseSymptoms),
		mapToString(submission.PlantConditions.DiseaseDetails),
		submission.PlantConditions.OtherDisease,
		fmt.Sprintf("%t", submission.PlantConditions.Other),
		submission.PlantConditions.OtherConditionText,
		strings.Join(submission.Images, ","),
		strings.Join(submission.Videos, ","),
		strings.Join(submission.Audio, ","),
	}
}

func mapToString(m map[string]bool) string {
	var parts []string
	for key, value := range m {
		if value {
			parts = append(parts, key)
		}
	}
	return strings.Join(parts, ", ")
}
