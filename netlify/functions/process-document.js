// Netlify Function to process documents with Venice.ai API
// Note: The DEP0040 warning about punycode is related to dependencies and can be ignored
// It's a Node.js internal module that's being deprecated but still used by some packages
const fetch = require('node-fetch');

// Hard-coded API key for testing - ensure it's properly formatted
const VENICE_API_KEY = "n9jfLskZuDX9ecMPH2H6SfKLgCtHlIS6zjo4XAGY6l";

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
    const { file, filename } = JSON.parse(event.body);
    
    if (!file) {
      throw new Error('Missing required parameter: file');
    }

    // Log file information
    console.log('File name:', filename);
    console.log('File data length:', file.length);
    
    // Use the hard-coded API key
    const apiKey = VENICE_API_KEY;
    
    // Validate API key
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('API key is missing or invalid');
    }
    
    // Create a simulated CSV response for testing
    const simulateExtraction = () => {
      const headers = "Slide #,Title,Summary";
      const rows = [
        `1,"Introduction","This slide introduces the main topic of the presentation with an overview of key points to be discussed."`,
        `2,"Background","This slide provides historical context and background information relevant to the presentation topic."`,
        `3,"Key Findings","This slide presents the main findings or results, highlighting important data points and insights."`,
        `4,"Conclusion","This slide summarizes the key takeaways and presents final thoughts on the topic."`,
      ];
      return [headers, ...rows].join('\n');
    };

    // First, try to extract text from the PowerPoint using a text extraction API
    console.log('Extracting content from PowerPoint...');
    console.log('File type:', filename.split('.').pop());
    
    // Determine the correct MIME type based on file extension
    let mimeType = 'application/pdf';
    const fileExt = filename.split('.').pop().toLowerCase();
    if (fileExt === 'ppt' || fileExt === 'pptx') {
      mimeType = fileExt === 'ppt' ? 'application/vnd.ms-powerpoint' : 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    }
    console.log('Using MIME type:', mimeType);
    
    // Create the request payload for PowerPoint extraction
    const extractionPayload = {
      model: "qwen-2.5-vl",  // Using Qwen 2.5 VL 72B model from Venice.ai
      messages: [
        {
          role: "system",
          content: "You are a document analyzer that extracts structured information from PowerPoint presentations. For each slide, extract the slide number, title, and a comprehensive summary of the content."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please analyze this PowerPoint presentation. For each slide, extract the following information:\n1. Slide # (the slide number)\n2. Title (the main heading or title of the slide)\n3. Summary (a comprehensive summary of the slide content, including key points, data, and insights)\n\nFormat your response as CSV with these three columns: 'Slide #', 'Title', 'Summary'. Make sure to include all slides and provide detailed summaries."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${file}`
              }
            }
          ]
        }
      ],
      temperature: 0.1,
      max_tokens: 4000
    };

    console.log('Sending request to Venice.ai API...');
    console.log('API endpoint: https://api.venice.ai/api/v1/chat/completions');
    console.log('Using model:', extractionPayload.model);
    
    // Log a truncated version of the payload for debugging
    const payloadForLogging = { ...extractionPayload };
    if (payloadForLogging.messages && payloadForLogging.messages.length > 0) {
      for (let i = 0; i < payloadForLogging.messages.length; i++) {
        const message = payloadForLogging.messages[i];
        if (message.content && Array.isArray(message.content)) {
          for (let j = 0; j < message.content.length; j++) {
            const content = message.content[j];
            if (content.type === 'image_url' && content.image_url && content.image_url.url) {
              // Truncate the base64 data for logging
              const url = content.image_url.url;
              const prefix = url.substring(0, url.indexOf(',') + 1);
              content.image_url.url = prefix + '[BASE64_DATA_TRUNCATED]';
            }
          }
        }
      }
    }
    console.log('Request payload (truncated):', JSON.stringify(payloadForLogging, null, 2));
    
    // Make the extraction request
    const extractionResponse = await fetch('https://api.venice.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(extractionPayload)
    });

    console.log('Extraction response status:', extractionResponse.status);
    console.log('Response headers:', JSON.stringify(Object.fromEntries([...extractionResponse.headers.entries()])));
    
    if (extractionResponse.ok) {
      const extractionResult = await extractionResponse.json();
      console.log('API Response received');
      
      if (extractionResult.choices && extractionResult.choices.length > 0 && extractionResult.choices[0].message) {
        const csvData = extractionResult.choices[0].message.content;
        console.log('Successfully extracted content from PowerPoint');
        console.log('CSV data first 100 chars:', csvData.substring(0, 100));
        
        // Basic validation of CSV format
        const lines = csvData.trim().split('\n');
        if (lines.length < 2) {
          console.log('CSV validation failed: not enough lines');
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              csvData: simulateExtraction(),
              note: "Using simulated data due to extraction issues - API returned insufficient data"
            })
          };
        }
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            csvData: csvData
          })
        };
      } else {
        console.log('API response missing expected data structure:', JSON.stringify(extractionResult, null, 2));
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            csvData: simulateExtraction(),
            note: "Using simulated data due to unexpected API response format"
          })
        };
      }
    } else {
      // Try to get the error message from the response
      let errorMessage = "Unknown error";
      try {
        const errorResponse = await extractionResponse.text();
        console.log('Error response from API:', errorResponse);
        try {
          const errorJson = JSON.parse(errorResponse);
          errorMessage = errorJson.error || errorJson.message || "API error";
        } catch (e) {
          errorMessage = errorResponse || "API error";
        }
      } catch (e) {
        errorMessage = `API returned status ${extractionResponse.status}`;
      }
      
      console.log('Extraction failed:', errorMessage);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          csvData: simulateExtraction(),
          note: `Using simulated data due to API error: ${errorMessage}`
        })
      };
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