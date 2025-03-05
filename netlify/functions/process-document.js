// Netlify Function to process documents with Venice.ai API
// Note: The DEP0040 warning about punycode is related to dependencies and can be ignored
// It's a Node.js internal module that's being deprecated but still used by some packages
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    if (event.httpMethod !== 'POST') {
      throw new Error('Only POST requests are allowed');
    }

    console.log('Processing request...');
    const { file, apiKey, fields, filename } = JSON.parse(event.body);
    
    if (!file || !apiKey || !fields) {
      throw new Error('Missing required parameters: file, apiKey, or fields');
    }

    // Create the field extraction prompt
    const fieldPrompt = fields.map(field => `- ${field}`).join('\n');
    
    // Create the request payload
    const payload = {
      model: "qwen-2.5-vl",
      messages: [
        {
          role: "system",
          content: "You are a document analyzer that extracts structured information from PDFs and converts it to CSV format."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Please analyze this document and extract the following fields:\n${fieldPrompt}\n\nReturn ONLY the CSV data with a header row containing the field names. Each subsequent row should contain the extracted data for one section/page of the document.`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:application/pdf;base64,${file}`
              }
            }
          ]
        }
      ],
      temperature: 0.3,
      max_tokens: 2000
    };

    console.log('Sending request to Venice.ai...');
    const response = await fetch('https://api.venice.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    console.log('Response status:', response.status);
    const responseText = await response.text();
    console.log('Response:', responseText);

    if (!response.ok) {
      throw new Error(`API request failed (${response.status}): ${responseText}`);
    }

    const result = JSON.parse(responseText);
    const csvData = result.choices[0].message.content;

    // Validate CSV format
    const lines = csvData.trim().split('\n');
    const headerFields = lines[0].split(',').length;
    const isValidCsv = lines.every(line => line.split(',').length === headerFields);

    if (!isValidCsv) {
      throw new Error('Invalid CSV format in response');
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        csvData: csvData
      })
    };
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message,
        stack: error.stack,
        details: 'Check Netlify function logs for more information'
      })
    };
  }
}; 