/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/main/index.ts":
/*!***************************!*\
  !*** ./src/main/index.ts ***!
  \***************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("{\nvar __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {\n    if (k2 === undefined) k2 = k;\n    var desc = Object.getOwnPropertyDescriptor(m, k);\n    if (!desc || (\"get\" in desc ? !m.__esModule : desc.writable || desc.configurable)) {\n      desc = { enumerable: true, get: function() { return m[k]; } };\n    }\n    Object.defineProperty(o, k2, desc);\n}) : (function(o, m, k, k2) {\n    if (k2 === undefined) k2 = k;\n    o[k2] = m[k];\n}));\nvar __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {\n    Object.defineProperty(o, \"default\", { enumerable: true, value: v });\n}) : function(o, v) {\n    o[\"default\"] = v;\n});\nvar __importStar = (this && this.__importStar) || (function () {\n    var ownKeys = function(o) {\n        ownKeys = Object.getOwnPropertyNames || function (o) {\n            var ar = [];\n            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;\n            return ar;\n        };\n        return ownKeys(o);\n    };\n    return function (mod) {\n        if (mod && mod.__esModule) return mod;\n        var result = {};\n        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== \"default\") __createBinding(result, mod, k[i]);\n        __setModuleDefault(result, mod);\n        return result;\n    };\n})();\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\nconst electron_1 = __webpack_require__(/*! electron */ \"electron\");\nconst path = __importStar(__webpack_require__(/*! path */ \"path\"));\n// Временно закомментируем, пока не исправим\n// import { DeviceManager } from '../core/devices/DeviceManager';\nlet mainWindow = null;\n// let deviceManager: DeviceManager;\n// Временный класс-заглушка\nclass DeviceManager {\n    devices = new Map();\n    async addDevice(profile) {\n        this.devices.set(profile.id, profile);\n    }\n    async removeDevice(deviceId) {\n        this.devices.delete(deviceId);\n    }\n    async readDevice(deviceId) {\n        return { deviceId, data: {}, timestamp: new Date() };\n    }\n    on(event, callback) {\n        // Заглушка\n    }\n}\nlet deviceManager;\n// Остальной код остаётся тем же...\nfunction createWindow() {\n    mainWindow = new electron_1.BrowserWindow({\n        width: 1400,\n        height: 900,\n        webPreferences: {\n            nodeIntegration: false,\n            contextIsolation: true,\n            preload: path.join(__dirname, 'preload.js')\n        }\n    });\n    mainWindow.loadFile(path.join(__dirname, 'index.html'));\n    if (true) {\n        mainWindow.webContents.openDevTools();\n    }\n    mainWindow.on('closed', () => {\n        mainWindow = null;\n    });\n}\nelectron_1.app.whenReady().then(() => {\n    createWindow();\n    deviceManager = new DeviceManager();\n    const menu = electron_1.Menu.buildFromTemplate([\n        {\n            label: 'Файл',\n            submenu: [\n                {\n                    label: 'Новый профиль',\n                    accelerator: 'CmdOrCtrl+N',\n                    click: () => {\n                        mainWindow?.webContents.send('menu-new-profile');\n                    }\n                },\n                {\n                    label: 'Открыть профиль',\n                    accelerator: 'CmdOrCtrl+O',\n                    click: () => {\n                        mainWindow?.webContents.send('menu-open-profile');\n                    }\n                },\n                { type: 'separator' },\n                {\n                    label: 'Выход',\n                    accelerator: 'CmdOrCtrl+Q',\n                    click: () => {\n                        electron_1.app.quit();\n                    }\n                }\n            ]\n        },\n        {\n            label: 'Вид',\n            submenu: [\n                { role: 'reload' },\n                { role: 'toggleDevTools' },\n                { type: 'separator' },\n                { role: 'resetZoom' },\n                { role: 'zoomIn' },\n                { role: 'zoomOut' }\n            ]\n        }\n    ]);\n    electron_1.Menu.setApplicationMenu(menu);\n});\nelectron_1.app.on('window-all-closed', () => {\n    if (process.platform !== 'darwin') {\n        electron_1.app.quit();\n    }\n});\nelectron_1.app.on('activate', () => {\n    if (mainWindow === null) {\n        createWindow();\n    }\n});\n// IPC обработчики\nelectron_1.ipcMain.handle('get-serial-ports', async () => {\n    try {\n        const { SerialPort } = await Promise.resolve().then(() => __importStar(__webpack_require__(/*! serialport */ \"serialport\")));\n        const ports = await SerialPort.list();\n        return ports.map(port => ({\n            path: port.path,\n            manufacturer: port.manufacturer,\n            serialNumber: port.serialNumber,\n            pnpId: port.pnpId,\n            friendlyName: port.path\n        }));\n    }\n    catch (error) {\n        console.error('Error getting serial ports:', error);\n        return [];\n    }\n});\nelectron_1.ipcMain.handle('connect-device', async (event, profile) => {\n    try {\n        await deviceManager.addDevice(profile);\n        return { success: true };\n    }\n    catch (error) {\n        return { success: false, error: error.message };\n    }\n});\nelectron_1.ipcMain.handle('disconnect-device', async (event, deviceId) => {\n    try {\n        await deviceManager.removeDevice(deviceId);\n        return { success: true };\n    }\n    catch (error) {\n        return { success: false, error: error.message };\n    }\n});\nelectron_1.ipcMain.handle('read-device-data', async (event, deviceId) => {\n    try {\n        const data = await deviceManager.readDevice(deviceId);\n        return { success: true, data };\n    }\n    catch (error) {\n        return { success: false, error: error.message };\n    }\n});\n\n\n//# sourceURL=webpack://multi-device-monitor/./src/main/index.ts?\n}");

/***/ }),

/***/ "electron":
/*!***************************!*\
  !*** external "electron" ***!
  \***************************/
/***/ ((module) => {

module.exports = require("electron");

/***/ }),

/***/ "path":
/*!***********************!*\
  !*** external "path" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("path");

/***/ }),

/***/ "serialport":
/*!*****************************!*\
  !*** external "serialport" ***!
  \*****************************/
/***/ ((module) => {

module.exports = require("serialport");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__("./src/main/index.ts");
/******/ 	
/******/ })()
;