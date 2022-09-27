'use strict'

const mongoose = require('mongoose')
const ObjectId = mongoose.Types.ObjectId

const defaultOptions = {
    autoIndex: false, // Don't build indexes
    maxPoolSize: 10, // Maintain up to 10 socket connections
    serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    family: 4 // Use IPv4, skip trying IPv6
}

class MongodbConnection {
    constructor (dsn) {
        this.config = {}
        this.config.dsn = dsn
    }

    connect(options={}) {
        mongoose.connect(this.config.dsn, {...defaultOptions, ...options})
        mongoose.connection.on('connecting', this.connectingCallback)
        mongoose.connection.on('connected', this.connectedCallback)
        mongoose.connection.on('disconnecting', this.disconnectingCallback)
        mongoose.connection.on('disconnected', this.disconnectedCallback)
        mongoose.connection.on('reconnected', this.reconnectedCallback)
        mongoose.connection.on('error', this.errorCallback)
        process.on('SIGINT', this.closeConnectionCallback)
        return this
    }

    setupModels (models={}) {
        let m = {}
        for (const modelName in models) {
            const modelObj = models[modelName]
            const opt = modelObj.options || {}
            const indexes = modelObj.indexes || []
            let schm = modelObj.schema || {}
            for (const k in schm) {
                if (schm[k] === 'ObjectId') schm[k] = ObjectId
            }
            const schema = new mongoose.Schema(schm, opt)
            if (indexes) {
                for (const {index, options} of indexes) {
                    schema.index(index, options)
                }
            }
            m[modelName] = mongoose.model(modelName, schema, modelName)
        }
        return m
    }

    closeConnectionCallback() {
        mongoose.connection.close()
        process.exit(0)
    }

    connectingCallback() {
        console.log('mongodb connecting')
    }

    reconnectedCallback() {
        console.log('mongodb reconnected')
    }

    disconnectingCallback() {
        console.log('mongodb disconnecting')
    }

    disconnectedCallback() {
        console.log('mongodb disconnected')
    }

    connectedCallback() {
        console.log('mongodb connected')
    }

    errorCallback() {
        console.log('mongodb connection error')
    }
}

class MongodbLibraries {
    constructor({dsn='', models={}, connectionOptions={}}) {
        this.config = {}
        if (dsn) this.config.dsn = dsn
        if (models) this.config.models = models
        if (connectionOptions) this.config.connectionOptions = connectionOptions
    }

    setConfig(configKey, configValue) {
        if (configKey && configValue) {
            this.config[configKey] = configValue
        }
        return this
    }

    getConfig(configKey) {
        return this.config[configKey]
    }

    getContext() {
        return mongoose
    }

    start() {
        const con = new MongodbConnection(this.config.dsn)
        con.connect(this.config.connectionOptions)
        const m = con.setupModels(this.config.models)
        return m
    }
}

module.exports = MongodbLibraries