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

/***/ "./src/core/protocols/ModbusClient.ts":
/*!********************************************!*\
  !*** ./src/core/protocols/ModbusClient.ts ***!
  \********************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("{\nvar __importDefault = (this && this.__importDefault) || function (mod) {\n    return (mod && mod.__esModule) ? mod : { \"default\": mod };\n};\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\nexports.ModbusClient = void 0;\nconst modbus_serial_1 = __importDefault(__webpack_require__(/*! modbus-serial */ \"modbus-serial\"));\nconst events_1 = __webpack_require__(/*! events */ \"events\");\nclass ModbusClient extends events_1.EventEmitter {\n    client;\n    isConnected = false;\n    pollInterval = null;\n    profile;\n    constructor(profile) {\n        super();\n        this.profile = profile;\n        this.client = new modbus_serial_1.default();\n    }\n    async connect() {\n        try {\n            if (this.profile.type === 'modbus-rtu') {\n                // Подключение через COM-порт\n                await this.client.connectRTUBuffered(this.profile.connection.port, {\n                    baudRate: this.profile.connection.baudRate || 9600,\n                    dataBits: 8,\n                    stopBits: 1,\n                    parity: 'none'\n                });\n            }\n            else if (this.profile.type === 'modbus-tcp') {\n                // Подключение через TCP\n                await this.client.connectTCP(this.profile.connection.host, {\n                    port: this.profile.connection.tcpPort || 502\n                });\n            }\n            this.client.setID(this.profile.connection.unitId);\n            this.client.setTimeout(this.profile.connection.timeout || 1000);\n            this.isConnected = true;\n            this.emit('connected');\n            // Запускаем опрос, если включен\n            if (this.profile.polling?.enabled) {\n                this.startPolling();\n            }\n        }\n        catch (error) {\n            this.emit('error', error);\n            throw error;\n        }\n    }\n    async disconnect() {\n        this.stopPolling();\n        if (this.isConnected && this.client) {\n            this.client.close(() => {\n                this.isConnected = false;\n                this.emit('disconnected');\n            });\n        }\n    }\n    startPolling() {\n        if (this.pollInterval) {\n            return;\n        }\n        const interval = this.profile.polling?.interval || 1000;\n        this.pollInterval = setInterval(async () => {\n            try {\n                await this.readAllParameters();\n            }\n            catch (error) {\n                this.emit('error', error);\n            }\n        }, interval);\n    }\n    stopPolling() {\n        if (this.pollInterval) {\n            clearInterval(this.pollInterval);\n            this.pollInterval = null;\n        }\n    }\n    async readAllParameters() {\n        const results = new Map();\n        for (const param of this.profile.parameters) {\n            try {\n                const value = await this.readParameter(param);\n                results.set(param.name, value);\n                this.emit('data', {\n                    parameter: param.name,\n                    value,\n                    timestamp: new Date()\n                });\n            }\n            catch (error) {\n                this.emit('error', {\n                    parameter: param.name,\n                    error\n                });\n            }\n        }\n        return results;\n    }\n    async readParameter(param) {\n        let rawValue;\n        // Читаем данные в зависимости от функции\n        if (param.functionCode === 3) {\n            // Holding Registers\n            const count = this.getRegisterCount(param.type);\n            const result = await this.client.readHoldingRegisters(param.address, count);\n            rawValue = result.data;\n        }\n        else if (param.functionCode === 4) {\n            // Input Registers\n            const count = this.getRegisterCount(param.type);\n            const result = await this.client.readInputRegisters(param.address, count);\n            rawValue = result.data;\n        }\n        else {\n            throw new Error(`Неподдерживаемый код функции: ${param.functionCode}`);\n        }\n        // Преобразуем значение в зависимости от типа\n        const value = this.convertValue(rawValue, param.type, param.byteOrder);\n        // Применяем масштабирование\n        const scaledValue = param.scale ? value * param.scale : value;\n        return scaledValue;\n    }\n    getRegisterCount(type) {\n        switch (type) {\n            case 'uint16':\n            case 'int16':\n                return 1;\n            case 'uint32':\n            case 'int32':\n            case 'float':\n                return 2;\n            case 'double':\n                return 4;\n            default:\n                return 1;\n        }\n    }\n    convertValue(raw, type, byteOrder) {\n        const registers = Array.isArray(raw) ? raw : [raw];\n        switch (type) {\n            case 'uint16':\n                return registers[0];\n            case 'int16':\n                return this.toInt16(registers[0]);\n            case 'uint32':\n                return this.toUint32(registers, byteOrder);\n            case 'int32':\n                return this.toInt32(registers, byteOrder);\n            case 'float':\n                return this.toFloat32(registers, byteOrder);\n            default:\n                return registers[0];\n        }\n    }\n    toInt16(value) {\n        return value > 32767 ? value - 65536 : value;\n    }\n    toUint32(registers, byteOrder) {\n        if (byteOrder === 'LE' || byteOrder === 'LE_SWAP') {\n            return registers[1] * 65536 + registers[0];\n        }\n        return registers[0] * 65536 + registers[1];\n    }\n    toInt32(registers, byteOrder) {\n        const uint32 = this.toUint32(registers, byteOrder);\n        return uint32 > 2147483647 ? uint32 - 4294967296 : uint32;\n    }\n    toFloat32(registers, byteOrder) {\n        const buffer = new ArrayBuffer(4);\n        const view = new DataView(buffer);\n        if (byteOrder === 'LE' || byteOrder === 'LE_SWAP') {\n            view.setUint16(0, registers[1], false);\n            view.setUint16(2, registers[0], false);\n        }\n        else {\n            view.setUint16(0, registers[0], false);\n            view.setUint16(2, registers[1], false);\n        }\n        return view.getFloat32(0, byteOrder?.startsWith('LE'));\n    }\n    isActive() {\n        return this.isConnected;\n    }\n}\nexports.ModbusClient = ModbusClient;\n\n\n//# sourceURL=webpack://multi-device-monitor/./src/core/protocols/ModbusClient.ts?\n}");

/***/ }),

/***/ "./src/devices/DeviceManager.ts":
/*!**************************************!*\
  !*** ./src/devices/DeviceManager.ts ***!
  \**************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

eval("{\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\nexports.DeviceManager = void 0;\nconst events_1 = __webpack_require__(/*! events */ \"events\");\nconst ModbusClient_1 = __webpack_require__(/*! ../core/protocols/ModbusClient */ \"./src/core/protocols/ModbusClient.ts\");\nclass DeviceManager extends events_1.EventEmitter {\n    devices = new Map();\n    activeConnections = new Map();\n    deviceStatuses = new Map();\n    constructor() {\n        super();\n    }\n    async addDevice(profile) {\n        try {\n            // Сохраняем профиль устройства\n            this.devices.set(profile.id, profile);\n            // Создаём статус устройства\n            const deviceStatus = {\n                id: profile.id,\n                name: profile.name,\n                type: profile.type,\n                status: 'disconnected',\n                lastUpdate: new Date()\n            };\n            this.deviceStatuses.set(profile.id, deviceStatus);\n            // Подключаемся через Modbus\n            if (profile.type === 'modbus-rtu' || profile.type === 'modbus-tcp') {\n                const modbusClient = new ModbusClient_1.ModbusClient(profile);\n                // Подписываемся на события\n                modbusClient.on('connected', () => {\n                    console.log(`Устройство ${profile.name} подключено`);\n                    deviceStatus.status = 'connected';\n                    deviceStatus.lastUpdate = new Date();\n                    this.emit('device-status-changed', deviceStatus);\n                });\n                modbusClient.on('disconnected', () => {\n                    console.log(`Устройство ${profile.name} отключено`);\n                    deviceStatus.status = 'disconnected';\n                    deviceStatus.lastUpdate = new Date();\n                    this.emit('device-status-changed', deviceStatus);\n                });\n                modbusClient.on('data', (data) => {\n                    console.log(`Данные от ${profile.name}:`, data);\n                    deviceStatus.lastUpdate = new Date();\n                    this.emit('device-data', {\n                        deviceId: profile.id,\n                        deviceName: profile.name,\n                        ...data\n                    });\n                });\n                modbusClient.on('error', (error) => {\n                    console.error(`Ошибка устройства ${profile.name}:`, error);\n                    deviceStatus.status = 'error';\n                    deviceStatus.lastUpdate = new Date();\n                    this.emit('device-error', {\n                        deviceId: profile.id,\n                        deviceName: profile.name,\n                        error: error.message || error\n                    });\n                });\n                // Сохраняем клиент\n                this.activeConnections.set(profile.id, modbusClient);\n                // Пытаемся подключиться\n                try {\n                    await modbusClient.connect();\n                    deviceStatus.status = 'connected';\n                }\n                catch (error) {\n                    deviceStatus.status = 'error';\n                    throw error;\n                }\n            }\n            this.emit('device-added', deviceStatus);\n        }\n        catch (error) {\n            this.emit('device-error', {\n                deviceId: profile.id,\n                error: error instanceof Error ? error.message : 'Unknown error'\n            });\n            throw error;\n        }\n    }\n    async removeDevice(deviceId) {\n        try {\n            // Отключаем Modbus соединение\n            const modbusClient = this.activeConnections.get(deviceId);\n            if (modbusClient) {\n                await modbusClient.disconnect();\n                this.activeConnections.delete(deviceId);\n            }\n            this.devices.delete(deviceId);\n            this.deviceStatuses.delete(deviceId);\n            this.emit('device-removed', deviceId);\n        }\n        catch (error) {\n            this.emit('device-error', {\n                deviceId,\n                error: error instanceof Error ? error.message : 'Unknown error'\n            });\n            throw error;\n        }\n    }\n    async readDevice(deviceId) {\n        const device = this.devices.get(deviceId);\n        const modbusClient = this.activeConnections.get(deviceId);\n        if (!device) {\n            throw new Error(`Устройство ${deviceId} не найдено`);\n        }\n        if (!modbusClient || !modbusClient.isActive()) {\n            throw new Error(`Устройство ${device.name} не подключено`);\n        }\n        try {\n            const data = await modbusClient.readAllParameters();\n            return {\n                deviceId,\n                deviceName: device.name,\n                data: Object.fromEntries(data),\n                timestamp: new Date()\n            };\n        }\n        catch (error) {\n            throw new Error(`Ошибка чтения данных: ${error}`);\n        }\n    }\n    async readSingleParameter(deviceId, parameterName) {\n        const device = this.devices.get(deviceId);\n        const modbusClient = this.activeConnections.get(deviceId);\n        if (!device || !modbusClient) {\n            throw new Error(`Устройство ${deviceId} не найдено`);\n        }\n        const parameter = device.parameters.find(p => p.name === parameterName);\n        if (!parameter) {\n            throw new Error(`Параметр ${parameterName} не найден`);\n        }\n        // Читаем один параметр\n        const data = await modbusClient.readAllParameters();\n        return data.get(parameterName);\n    }\n    getDevices() {\n        return Array.from(this.deviceStatuses.values());\n    }\n    getDeviceProfiles() {\n        return Array.from(this.devices.values());\n    }\n    getDeviceStatus(deviceId) {\n        return this.deviceStatuses.get(deviceId);\n    }\n    isDeviceConnected(deviceId) {\n        const modbusClient = this.activeConnections.get(deviceId);\n        return modbusClient ? modbusClient.isActive() : false;\n    }\n}\nexports.DeviceManager = DeviceManager;\n\n\n//# sourceURL=webpack://multi-device-monitor/./src/devices/DeviceManager.ts?\n}");

/***/ }),

/***/ "./src/main/index.ts":
/*!***************************!*\
  !*** ./src/main/index.ts ***!
  \***************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("{\nvar __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {\n    if (k2 === undefined) k2 = k;\n    var desc = Object.getOwnPropertyDescriptor(m, k);\n    if (!desc || (\"get\" in desc ? !m.__esModule : desc.writable || desc.configurable)) {\n      desc = { enumerable: true, get: function() { return m[k]; } };\n    }\n    Object.defineProperty(o, k2, desc);\n}) : (function(o, m, k, k2) {\n    if (k2 === undefined) k2 = k;\n    o[k2] = m[k];\n}));\nvar __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {\n    Object.defineProperty(o, \"default\", { enumerable: true, value: v });\n}) : function(o, v) {\n    o[\"default\"] = v;\n});\nvar __importStar = (this && this.__importStar) || (function () {\n    var ownKeys = function(o) {\n        ownKeys = Object.getOwnPropertyNames || function (o) {\n            var ar = [];\n            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;\n            return ar;\n        };\n        return ownKeys(o);\n    };\n    return function (mod) {\n        if (mod && mod.__esModule) return mod;\n        var result = {};\n        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== \"default\") __createBinding(result, mod, k[i]);\n        __setModuleDefault(result, mod);\n        return result;\n    };\n})();\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\nconst electron_1 = __webpack_require__(/*! electron */ \"electron\");\nconst path = __importStar(__webpack_require__(/*! path */ \"path\"));\nconst DeviceManager_1 = __webpack_require__(/*! ../devices/DeviceManager */ \"./src/devices/DeviceManager.ts\");\nconst ProfileManager_1 = __webpack_require__(/*! ./services/ProfileManager */ \"./src/main/services/ProfileManager.ts\");\nlet mainWindow = null;\nlet deviceManager;\nlet profileManager;\nfunction createWindow() {\n    mainWindow = new electron_1.BrowserWindow({\n        width: 1400,\n        height: 900,\n        webPreferences: {\n            nodeIntegration: false,\n            contextIsolation: true,\n            preload: path.join(__dirname, 'preload.js')\n        }\n    });\n    mainWindow.loadFile(path.join(__dirname, 'index.html'));\n    if (true) {\n        mainWindow.webContents.openDevTools();\n    }\n    mainWindow.on('closed', () => {\n        mainWindow = null;\n    });\n}\nelectron_1.app.whenReady().then(() => {\n    createWindow();\n    deviceManager = new DeviceManager_1.DeviceManager();\n    profileManager = new ProfileManager_1.ProfileManager();\n    // Подписываемся на события от DeviceManager\n    deviceManager.on('device-data', (data) => {\n        mainWindow?.webContents.send('device-data', data);\n    });\n    deviceManager.on('device-error', (error) => {\n        mainWindow?.webContents.send('device-error', error);\n    });\n    deviceManager.on('device-status-changed', (status) => {\n        mainWindow?.webContents.send('device-status-changed', status);\n    });\n    deviceManager.on('device-added', (device) => {\n        mainWindow?.webContents.send('device-added', device);\n    });\n    deviceManager.on('device-removed', (deviceId) => {\n        mainWindow?.webContents.send('device-removed', deviceId);\n    });\n    const menu = electron_1.Menu.buildFromTemplate([\n        {\n            label: 'Файл',\n            submenu: [\n                {\n                    label: 'Новый профиль',\n                    accelerator: 'CmdOrCtrl+N',\n                    click: () => {\n                        mainWindow?.webContents.send('menu-new-profile');\n                    }\n                },\n                {\n                    label: 'Открыть профиль',\n                    accelerator: 'CmdOrCtrl+O',\n                    click: () => {\n                        mainWindow?.webContents.send('menu-open-profile');\n                    }\n                },\n                { type: 'separator' },\n                {\n                    label: 'Выход',\n                    accelerator: 'CmdOrCtrl+Q',\n                    click: () => {\n                        electron_1.app.quit();\n                    }\n                }\n            ]\n        },\n        {\n            label: 'Вид',\n            submenu: [\n                { role: 'reload' },\n                { role: 'toggleDevTools' },\n                { type: 'separator' },\n                { role: 'resetZoom' },\n                { role: 'zoomIn' },\n                { role: 'zoomOut' }\n            ]\n        }\n    ]);\n    electron_1.Menu.setApplicationMenu(menu);\n});\nelectron_1.app.on('window-all-closed', () => {\n    if (process.platform !== 'darwin') {\n        electron_1.app.quit();\n    }\n});\nelectron_1.app.on('activate', () => {\n    if (mainWindow === null) {\n        createWindow();\n    }\n});\n// IPC обработчики\nelectron_1.ipcMain.handle('get-serial-ports', async () => {\n    try {\n        const { SerialPort } = await Promise.resolve().then(() => __importStar(__webpack_require__(/*! serialport */ \"serialport\")));\n        const ports = await SerialPort.list();\n        return ports.map(port => ({\n            path: port.path,\n            manufacturer: port.manufacturer,\n            serialNumber: port.serialNumber,\n            pnpId: port.pnpId,\n            friendlyName: port.path\n        }));\n    }\n    catch (error) {\n        console.error('Error getting serial ports:', error);\n        return [];\n    }\n});\nelectron_1.ipcMain.handle('connect-device', async (event, profile) => {\n    try {\n        await deviceManager.addDevice(profile);\n        return { success: true };\n    }\n    catch (error) {\n        return { success: false, error: error.message };\n    }\n});\nelectron_1.ipcMain.handle('disconnect-device', async (event, deviceId) => {\n    try {\n        await deviceManager.removeDevice(deviceId);\n        return { success: true };\n    }\n    catch (error) {\n        return { success: false, error: error.message };\n    }\n});\nelectron_1.ipcMain.handle('read-device-data', async (event, deviceId) => {\n    try {\n        const data = await deviceManager.readDevice(deviceId);\n        return { success: true, data };\n    }\n    catch (error) {\n        return { success: false, error: error.message };\n    }\n});\n// Обработчики для профилей\nelectron_1.ipcMain.handle('save-profile', async (event, profile) => {\n    try {\n        await profileManager.saveProfile(profile);\n        return { success: true };\n    }\n    catch (error) {\n        return { success: false, error: error.message };\n    }\n});\nelectron_1.ipcMain.handle('load-profile', async (event, profileId) => {\n    try {\n        const profile = await profileManager.loadProfile(profileId);\n        return { success: true, profile };\n    }\n    catch (error) {\n        return { success: false, error: error.message };\n    }\n});\nelectron_1.ipcMain.handle('get-all-profiles', async () => {\n    try {\n        const profiles = await profileManager.getAllProfiles();\n        return { success: true, profiles };\n    }\n    catch (error) {\n        return { success: false, error: error.message, profiles: [] };\n    }\n});\nelectron_1.ipcMain.handle('delete-profile', async (event, profileId) => {\n    try {\n        await profileManager.deleteProfile(profileId);\n        return { success: true };\n    }\n    catch (error) {\n        return { success: false, error: error.message };\n    }\n});\n// Обработчик для получения списка устройств\nelectron_1.ipcMain.handle('get-devices', async () => {\n    try {\n        const devices = deviceManager.getDevices();\n        return { success: true, devices };\n    }\n    catch (error) {\n        return { success: false, error: error.message, devices: [] };\n    }\n});\n\n\n//# sourceURL=webpack://multi-device-monitor/./src/main/index.ts?\n}");

/***/ }),

/***/ "./src/main/services/ProfileManager.ts":
/*!*********************************************!*\
  !*** ./src/main/services/ProfileManager.ts ***!
  \*********************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("{\nvar __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {\n    if (k2 === undefined) k2 = k;\n    var desc = Object.getOwnPropertyDescriptor(m, k);\n    if (!desc || (\"get\" in desc ? !m.__esModule : desc.writable || desc.configurable)) {\n      desc = { enumerable: true, get: function() { return m[k]; } };\n    }\n    Object.defineProperty(o, k2, desc);\n}) : (function(o, m, k, k2) {\n    if (k2 === undefined) k2 = k;\n    o[k2] = m[k];\n}));\nvar __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {\n    Object.defineProperty(o, \"default\", { enumerable: true, value: v });\n}) : function(o, v) {\n    o[\"default\"] = v;\n});\nvar __importStar = (this && this.__importStar) || (function () {\n    var ownKeys = function(o) {\n        ownKeys = Object.getOwnPropertyNames || function (o) {\n            var ar = [];\n            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;\n            return ar;\n        };\n        return ownKeys(o);\n    };\n    return function (mod) {\n        if (mod && mod.__esModule) return mod;\n        var result = {};\n        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== \"default\") __createBinding(result, mod, k[i]);\n        __setModuleDefault(result, mod);\n        return result;\n    };\n})();\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\nexports.ProfileManager = void 0;\nconst fs = __importStar(__webpack_require__(/*! fs/promises */ \"fs/promises\"));\nconst path = __importStar(__webpack_require__(/*! path */ \"path\"));\nconst electron_1 = __webpack_require__(/*! electron */ \"electron\");\nclass ProfileManager {\n    profilesDir;\n    constructor() {\n        // Сохраняем профили в папке пользователя\n        this.profilesDir = path.join(electron_1.app.getPath('userData'), 'profiles');\n        this.ensureProfilesDir();\n    }\n    async ensureProfilesDir() {\n        try {\n            await fs.mkdir(this.profilesDir, { recursive: true });\n        }\n        catch (error) {\n            console.error('Ошибка создания папки профилей:', error);\n        }\n    }\n    async saveProfile(profile) {\n        const filePath = path.join(this.profilesDir, `${profile.id}.json`);\n        const data = JSON.stringify(profile, null, 2);\n        await fs.writeFile(filePath, data, 'utf8');\n    }\n    async loadProfile(profileId) {\n        const filePath = path.join(this.profilesDir, `${profileId}.json`);\n        const data = await fs.readFile(filePath, 'utf8');\n        return JSON.parse(data);\n    }\n    async getAllProfiles() {\n        try {\n            const files = await fs.readdir(this.profilesDir);\n            const profiles = [];\n            for (const file of files) {\n                if (file.endsWith('.json')) {\n                    const filePath = path.join(this.profilesDir, file);\n                    const data = await fs.readFile(filePath, 'utf8');\n                    profiles.push(JSON.parse(data));\n                }\n            }\n            return profiles;\n        }\n        catch (error) {\n            console.error('Ошибка загрузки профилей:', error);\n            return [];\n        }\n    }\n    async deleteProfile(profileId) {\n        const filePath = path.join(this.profilesDir, `${profileId}.json`);\n        await fs.unlink(filePath);\n    }\n    async exportProfile(profileId, exportPath) {\n        const profile = await this.loadProfile(profileId);\n        const data = JSON.stringify(profile, null, 2);\n        await fs.writeFile(exportPath, data, 'utf8');\n    }\n    async importProfile(importPath) {\n        const data = await fs.readFile(importPath, 'utf8');\n        const profile = JSON.parse(data);\n        // Генерируем новый ID, чтобы избежать конфликтов\n        profile.id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;\n        await this.saveProfile(profile);\n        return profile;\n    }\n}\nexports.ProfileManager = ProfileManager;\n\n\n//# sourceURL=webpack://multi-device-monitor/./src/main/services/ProfileManager.ts?\n}");

/***/ }),

/***/ "electron":
/*!***************************!*\
  !*** external "electron" ***!
  \***************************/
/***/ ((module) => {

module.exports = require("electron");

/***/ }),

/***/ "events":
/*!*************************!*\
  !*** external "events" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("events");

/***/ }),

/***/ "fs/promises":
/*!******************************!*\
  !*** external "fs/promises" ***!
  \******************************/
/***/ ((module) => {

module.exports = require("fs/promises");

/***/ }),

/***/ "modbus-serial":
/*!********************************!*\
  !*** external "modbus-serial" ***!
  \********************************/
/***/ ((module) => {

module.exports = require("modbus-serial");

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