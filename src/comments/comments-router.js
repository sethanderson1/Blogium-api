const express = require('express');
const path = require('path');
const CommentsService = require('./comments-service');
const { requireAuth } = require('../middleware/jwt-auth');

const commentsRouter = express.Router();
const jsonBodyParser = express.json();

commentsRouter
  .route('/')
  .post(requireAuth, jsonBodyParser, (req, res, next) => {
    const { post_id, content } = req.body;
    const newComment = { post_id, content, user_id: req.user.id };

    for (const [key, value] of Object.entries(newComment))
      if (value == null)
        return res.status(400).json({
          error: `Missing '${key}' in request body`,
        });

    CommentsService.insertComment(req.app.get('db'), newComment)
      .then((comment) => {
        res
          .status(201)
          .location(path.posix.join(req.originalUrl, `/${comment.id}`))
          .json(CommentsService.serializeComment(comment));
      })
      .catch((err) => {
        next(err);
      });
  });

commentsRouter
  .route('/:comment_id')
  .delete(checkCommentExists, requireAuth, (req, res, next) => {
    CommentsService.deleteComment(req.app.get('db'), req.params.comment_id)
      .then(() => {
        res.status(204).end();
      })
      .catch((err) => {
        next(err);
      });
  });

async function checkCommentExists(req, res, next) {
  try {
    const comment = await CommentsService.getById(
      req.app.get('db'),
      req.params.comment_id
    );

    if (!comment)
      return res.status(404).json({
        error: 'Comment does not exist',
      });

    res.comment = comment;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = commentsRouter;
