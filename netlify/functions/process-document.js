// Netlify Function to process documents with Venice.ai API
// Note: The DEP0040 warning about punycode is related to dependencies and can be ignored
// It's a Node.js internal module that's being deprecated but still used by some packages
const fetch = require('node-fetch');
const FormData = require('form-data');
const { Readable } = require('stream');

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
    const { file, apiKey, model, filename } = JSON.parse(event.body);
    
    if (!file || !apiKey || !model) {
      throw new Error('Missing required parameters: file, apiKey, or model');
    }

    console.log('Creating file buffer...');
    // Convert base64 to buffer
    const fileBuffer = Buffer.from(file, 'base64');
    console.log('File buffer created, size:', fileBuffer.length);

    // Create a readable stream from the buffer
    const stream = new Readable();
    stream.push(fileBuffer);
    stream.push(null);

    // Get file extension and mime type
    const fileExtension = filename ? `.${filename.split('.').pop()}` : '.pdf';
    const mimeType = fileExtension === '.pdf' ? 'application/pdf' : 
                     fileExtension === '.ppt' ? 'application/vnd.ms-powerpoint' :
                     fileExtension === '.pptx' ? 'application/vnd.openxmlformats-officedocument.presentationml.presentation' :
                     'application/octet-stream';

    // Create form data
    console.log('Creating FormData...');
    const form = new FormData();
    form.append('file', stream, {
      filename: `document${fileExtension}`,
      contentType: mimeType,
      knownLength: fileBuffer.length
    });

    console.log('Uploading file to Venice.ai...');
    try {
      const fileUploadResponse = await fetch('https://api.venice.ai/api/v1/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          ...form.getHeaders()
        },
        body: form
      });

      console.log('File upload response status:', fileUploadResponse.status);
      const uploadResponseText = await fileUploadResponse.text();
      console.log('File upload response:', uploadResponseText);

      if (!fileUploadResponse.ok) {
        throw new Error(`File upload failed (${fileUploadResponse.status}): ${uploadResponseText}`);
      }

      const uploadData = JSON.parse(uploadResponseText);
      console.log('File upload successful, ID:', uploadData.id);

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

      console.log('Sending chat completion request...');
      const completionResponse = await fetch('https://api.venice.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      console.log('Chat completion response status:', completionResponse.status);
      const completionResponseText = await completionResponse.text();
      console.log('Chat completion response:', completionResponseText);

      if (!completionResponse.ok) {
        throw new Error(`Chat completion failed (${completionResponse.status}): ${completionResponseText}`);
      }

      const result = JSON.parse(completionResponseText);
      console.log('Chat completion successful');

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result)
      };
    } catch (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`File upload error: ${uploadError.message}`);
    }
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