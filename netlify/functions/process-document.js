// Netlify Function to process documents with Venice.ai API
// Note: The DEP0040 warning about punycode is related to dependencies and can be ignored
// It's a Node.js internal module that's being deprecated but still used by some packages
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
    const { prompt, imageBase64, model, tempApiKey } = requestBody;
    
    if (!prompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Prompt is required',
          dataSource: 'none'
        })
      };
    }

    // Get the API key - use temporary key if provided, otherwise use environment variable
    const apiKey = tempApiKey || process.env.VENICE_API_KEY;
    
    if (!apiKey) {
      console.log('API key not configured in environment variables and no temporary key provided');
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'API key not configured',
          dataSource: 'none'
        })
      };
    }

    // Log function execution start for debugging
    console.log(`Processing document with model: ${model || 'qwen-2.5-vl'}, using ${tempApiKey ? 'temporary' : 'environment'} API key`);
    
    // Prepare the request to Venice.ai API
    const veniceApiUrl = 'https://api.venice.ai/api/v1/chat/completions';
    
    // Create the messages array - optimize by directly creating the final structure
    const messages = [{
      role: 'user',
      content: imageBase64 ? [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: `data:image/png;base64,${imageBase64}` } }
      ] : prompt
    }];

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
      console.error('Error from Venice.ai API:', data);
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

    // Log successful API call
    console.log('Venice.ai API call successful');
    
    // Return the response with data source information
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        content,
        dataSource: 'api',
        model: model || 'qwen-2.5-vl',
        usingTempKey: !!tempApiKey
      })
    };
  } catch (error) {
    console.error('Error processing document:', error.message);
    
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