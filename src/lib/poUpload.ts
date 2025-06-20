export async function savePoFile(file: File, quotationNo: string): Promise<string> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('quotationNo', quotationNo);

    const response = await fetch('/api/po-upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload PO file');
    }

    const data = await response.json();
    return data.fileUrl;
  } catch (error) {
    console.error('Error saving PO file:', error);
    throw error;
  }
} 