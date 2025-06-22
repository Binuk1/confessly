function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const apiKey = 'AIzaSyBGNAUEkWMJYHzo9AKdmqJ5CP3BJ-PAqok'; // REPLACE

  const response = UrlFetchApp.fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        requests: [
          {
            image: { source: { imageUri: data.imageUrl } },
            features: [{ type: 'SAFE_SEARCH_DETECTION' }]
          }
        ]
      })
    }
  );
  return ContentService.createTextOutput(response.getContentText())
    .setMimeType(ContentService.MimeType.JSON);
}
