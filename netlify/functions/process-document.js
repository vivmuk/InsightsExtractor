// Netlify Function to process documents with Venice.ai API
// Note: The DEP0040 warning about punycode is related to dependencies and can be ignored
// It's a Node.js internal module that's being deprecated but still used by some packages
const fetch = require('node-fetch');
const FormData = require('form-data');

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

    // Convert base64 to buffer
    const fileBuffer = Buffer.from(file, 'base64');

    // Create form data
    const formData = new FormData();
    formData.append('file', fileBuffer, {
      filename: filename,
      contentType: 'application/pdf'
    });
    formData.append('extractor', 'pdf');
    formData.append('model', 'llama-3.3-70b');

    console.log('Sending request to Venice.ai API...');
    console.log('API endpoint: https://api.venice.ai/api/v1/extract');
    console.log('Using model: llama-3.3-70b');
    
    // Make the extraction request
    const extractionResponse = await fetch('https://api.venice.ai/api/v1/extract', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        ...formData.getHeaders()
      },
      body: formData
    });

    console.log('Extraction response status:', extractionResponse.status);
    console.log('Response headers:', JSON.stringify(Object.fromEntries([...extractionResponse.headers.entries()])));
    
    if (extractionResponse.ok) {
      const extractionResult = await extractionResponse.json();
      console.log('API Response received');
      
      if (extractionResult.content && Array.isArray(extractionResult.content)) {
        // Convert the extracted content to CSV format
        const headers = "Slide #,Title,Summary";
        const rows = extractionResult.content.map(slide => 
          `${slide.slide_number},"${slide.title}","${slide.summary}"`
        );
        const csvData = [headers, ...rows].join('\n');
        
        console.log('Successfully extracted content');
        console.log('CSV data first 100 chars:', csvData.substring(0, 100));
        
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