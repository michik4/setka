import { Router } from 'express'
import { UserController } from '../controllers/user.controller'

const router = Router()
const userController = new UserController()

// Создание пользователя
router.post('/', (req, res) => userController.createUser(req, res))

// Получение всех пользователей
router.get('/', (req, res) => userController.getUsers(req, res))

// Создание случайного пользователя
router.post('/random', (req, res) => userController.createRandomUser(req, res))

// Получение пользователя по email
router.get('/email/:email', (req, res) => userController.getUserByEmail(req, res))

// Получение пользователя по nickname
router.get('/nickname/:nickname', (req, res) => userController.getUserByNickname(req, res))

// Обновление пользователя
router.put('/:id', (req, res) => userController.updateUser(req, res))

// Удаление пользователя
router.delete('/:id', (req, res) => userController.deleteUser(req, res))

export default router 