// Netlify Function to process documents with Venice.ai API
// Note: The DEP0040 warning about punycode is related to dependencies and can be ignored
// It's a Node.js internal module that's being deprecated but still used by some packages
const fetch = require('node-fetch');
const FormData = require('form-data');

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

    const { file, apiKey, model } = JSON.parse(event.body);

    // Convert base64 to buffer
    const fileBuffer = Buffer.from(file, 'base64');

    // Create FormData and append file
    const formData = new FormData();
    formData.append('file', fileBuffer, {
      filename: 'document.pdf',
      contentType: 'application/pdf'
    });

    // Upload file to Venice.ai
    const fileUploadResponse = await fetch('https://api.venice.ai/api/v1/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        ...formData.getHeaders()
      },
      body: formData
    });

    if (!fileUploadResponse.ok) {
      const errorText = await fileUploadResponse.text();
      console.error('File upload error:', errorText);
      throw new Error(`File upload failed: ${errorText}`);
    }

    const uploadData = await fileUploadResponse.json();
    console.log('File upload successful:', uploadData);

    // Create chat completion request
    const payload = {
      model: model,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Please analyze this document and extract the following information:
1. Title: The main heading or title
2. Summary: A brief overview
3. Medical Terms: Any specialized medical terminology
4. Diagnoses: Any medical diagnoses mentioned
5. Treatments: Any treatments or procedures mentioned

Format the response as JSON with these fields: title, summary, medicalTerms, diagnoses, treatments`
            },
            {
              type: "file",
              file_id: uploadData.id
            }
          ]
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    };

    console.log('Sending chat completion request:', payload);

    const completionResponse = await fetch('https://api.venice.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!completionResponse.ok) {
      const errorText = await completionResponse.text();
      console.error('Chat completion error:', errorText);
      throw new Error(`Chat completion failed: ${errorText}`);
    }

    const result = await completionResponse.json();
    console.log('Chat completion successful');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
}; 