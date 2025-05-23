"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_routes_1 = __importDefault(require("./auth.routes"));
const user_routes_1 = __importDefault(require("./user.routes"));
const post_routes_1 = __importDefault(require("./post.routes"));
const photo_routes_1 = __importDefault(require("./photo.routes"));
const album_routes_1 = __importDefault(require("./album.routes"));
const comment_routes_1 = __importDefault(require("./comment.routes"));
const router = (0, express_1.Router)();
router.use('/auth', auth_routes_1.default);
router.use('/users', user_routes_1.default);
router.use('/posts', post_routes_1.default);
router.use('/photos', photo_routes_1.default);
router.use('/albums', album_routes_1.default);
router.use('/comments', comment_routes_1.default);
exports.default = router;
