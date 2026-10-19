// Reduce la foto en el telefono antes de subirla: ahorra datos moviles y tiempo.
// 1600 px lado mayor, JPEG 0.8 -> ~250-400 KB por foto.
export async function comprimir(file, lado = 1600, calidad = 0.8) {
  if (!file.type.startsWith('image/')) throw new Error('El archivo no es una imagen.')
  let bmp
  try {
    bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    return file // formato no soportado por el navegador (ej. HEIC en Android viejo): se sube tal cual
  }
  const escala = Math.min(1, lado / Math.max(bmp.width, bmp.height))
  const w = Math.round(bmp.width * escala)
  const h = Math.round(bmp.height * escala)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d').drawImage(bmp, 0, 0, w, h)
  bmp.close?.()
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', calidad))
  if (!blob || blob.size >= file.size) return file
  const nombre = file.name.replace(/\.[^.]+$/, '') || 'foto'
  return new File([blob], `${nombre}.jpg`, { type: 'image/jpeg' })
}
