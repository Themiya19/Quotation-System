export async function saveAnnexureFile(file: File, quotationNo: string): Promise<string> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('quotationNo', quotationNo);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload file');
    }

    const data = await response.json();
    return data.url;
  } catch (error) {
    console.error('Error saving annexure file:', error);
    throw new Error('Failed to save annexure file');
  }
} 