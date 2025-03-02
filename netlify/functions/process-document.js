// Netlify Function to process documents with Venice.ai API
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    // Parse the request body
    const requestBody = JSON.parse(event.body);
    const { prompt, imageBase64, model } = requestBody;
    
    if (!prompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Prompt is required' })
      };
    }

    // Get the API key from environment variables (set in Netlify dashboard)
    const apiKey = process.env.VENICE_API_KEY;
    
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'API key not configured',
          dataSource: 'none'
        })
      };
    }

    // Prepare the request to Venice.ai API
    const veniceApiUrl = 'https://api.venice.ai/api/v1/chat/completions';
    
    // Create the messages array
    const messages = [
      {
        role: 'user',
        content: prompt
      }
    ];

    // If an image is provided, add it to the message content
    if (imageBase64) {
      messages[0].content = [
        {
          type: 'text',
          text: prompt
        },
        {
          type: 'image_url',
          image_url: {
            url: `data:image/png;base64,${imageBase64}`
          }
        }
      ];
    }

    // Create the request payload
    const payload = {
      model: model || 'qwen-2.5-vl', // Default to Qwen 2.5 VL if not specified
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000
    };

    // Make the request to Venice.ai API
    const response = await fetch(veniceApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    // Parse the response
    const data = await response.json();

    // Check for errors
    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ 
          error: 'Error from Venice.ai API', 
          details: data,
          dataSource: 'error'
        })
      };
    }

    // Extract the content from the response
    let content = '';
    if (data.choices && data.choices.length > 0 && data.choices[0].message) {
      content = data.choices[0].message.content;
    }

    // Return the response with data source information
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        content,
        dataSource: 'api',
        model: model || 'qwen-2.5-vl'
      })
    };
  } catch (error) {
    console.error('Error processing document:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal Server Error', 
        message: error.message,
        dataSource: 'error'
      })
    };
  }
}; 