async def Process_Prescription(file: UploadFile = File(...)):
    """
    Function to scan the prescription and return structured medical JSON.
    """
    # Read the uploaded image bytes
    contents = await file.read()
    
    # Prompting Gemini 3 Flash to perform the OCR and extraction
    response = client.models.generate_content(
        model="gemini-3-flash-preview",
        contents=[
            types.Part.from_bytes(data=contents, mime_type="image/jpeg"),
            "Extract all medicine names, dosages, patient info, and diagnosis from this image."
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=PrescriptionData,
        ),
    )
    
    # Returns the parsed JSON directly to the frontend
    return response.parsed