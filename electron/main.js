
const { app, BrowserWindow } = require('electron')
const path = require('path')
// Ventana principal del .EXE - abre tu sistema como programa de escritorio, no navegador
function createWindow(){
  const win = new BrowserWindow({
    width: 1400, height: 900,
    icon: path.join(__dirname, '../public/icon.ico'),
    webPreferences: { nodeIntegration: false, contextIsolation: true }
  })
  // En desarrollo carga localhost, en produccion carga dist/index.html
  if(process.env.NODE_ENV==='development'){
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}
app.whenReady().then(createWindow)
app.on('window-all-closed', ()=>{ if(process.platform!=='darwin') app.quit() })
