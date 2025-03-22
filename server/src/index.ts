import express from 'express'
import { createServer } from 'http'
import cors from 'cors'
import dotenv from 'dotenv'
import { AppDataSource } from './db/db_connect'
import routes from './routes/routes'
import { WebSocketService } from './services/WebSocketService'

dotenv.config()

const app = express()
const server = createServer(app)

// Middleware
app.use(cors())
app.use(express.json())

// Подключение к базе данных
AppDataSource.initialize()
  .then(() => {
    console.log('Подключено к PostgreSQL')
  })
  .catch(error => console.error('Ошибка подключения к PostgreSQL:', error))

// Инициализация WebSocket
const wsService = new WebSocketService(server)

// Подключаем все маршруты под /api
app.use('/api', routes)

// Обработка ошибок
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack)
  res.status(500).send('Что-то пошло не так!')
})

const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`)
}) 