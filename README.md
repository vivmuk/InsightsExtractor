# Medical Document Extraction Tool

A simple web-based tool for extracting medical information from PDF and PowerPoint documents using the Venice.ai API.

## Overview

This tool allows medical professionals and healthcare organizations to:

- Upload up to 3 PDF or PowerPoint files
- Extract key medical information using AI
- View the extracted data in a structured table
- Download the results as a CSV file

## How to Use

1. **Open the Application**
   - Visit your deployed Netlify site URL

2. **Upload Documents**
   - Click "Select Files" to upload up to 3 PDF or PowerPoint files
   - You can remove files by clicking the "✕" button next to each file

3. **Select an AI Model**
   - Choose from the available Venice.ai models
   - For document processing, we recommend using "Qwen 2.5 VL 72B" which is selected by default

4. **Process Documents**
   - Click "Process Documents" to start the extraction
   - Wait for the processing to complete (this may take a minute)

5. **View and Download Results**
   - The extracted information will be displayed in a table
   - Click "Download as CSV" to save the results as a CSV file

## Extracted Information

For each page or slide in your documents, the tool extracts:

- Title: The main heading or title
- Summary: A brief summary of the key information
- Medical Terms: Specialized medical terminology
- Diagnoses: Medical diagnoses mentioned
- Treatments: Treatments or procedures mentioned

## Deployment Instructions

### Prerequisites
- GitHub account
- Netlify account
- Venice.ai API key

### Step 1: Push to GitHub
1. Create a new repository on GitHub
2. Push your code to the repository:
```
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/medical-document-extraction.git
git push -u origin main
```

### Step 2: Deploy to Netlify
1. Log in to Netlify
2. Click "New site from Git"
3. Select GitHub and authorize Netlify
4. Select your repository
5. Configure build settings:
   - Build command: Leave empty
   - Publish directory: `.`
6. Click "Deploy site"

### Step 3: Configure Environment Variables
1. In your Netlify dashboard, go to "Site settings" > "Environment variables"
2. Add a new variable:
   - Key: `VENICE_API_KEY`
   - Value: Your Venice.ai API key
3. Save the variable
4. Trigger a new deployment for the changes to take effect

## Technical Notes

- This application uses Netlify Functions to securely store your Venice.ai API key
- Document processing is performed using the Venice.ai API
- Your documents are not stored on any server
- For the MVP, each document is processed as if it has 3 pages/slides

## Requirements

- A modern web browser
- Internet connection

## Privacy & Security

- Your documents never leave your computer except to be sent directly to the Venice.ai API via our secure Netlify Function
- No data is stored on any server
- All processing happens in your browser or through the secure Venice.ai API

## Support

For questions or support, please contact [your-email@example.com] 