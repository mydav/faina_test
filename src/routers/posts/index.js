const express = require("express");
const Comment = require("../../models/comment");
const Post = require("../../models/posts");
const passport = require('passport')
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const postsRouter = express.Router();

postsRouter.get("/", async (req, res) => {
    try{
        const posts = await Post.find({}).populate({path: "comments", populate: { path: 'postedBy', select: 'username profile', populate: { path: 'profile'}}});
        res.send(posts);
    } catch(err){
        res.send(err)
    }
});

postsRouter.get("/:postId", async (req, res) => {
    try {
        const post = await Post.findById(req.params.postId).populate({path: "comments", populate: { path: 'postedBy', select: 'username profile', populate: { path: 'profile'}}});
        if (post) {
            post.comments[0].populate("postedBy").execPopulate();
            res.send(post);
        } else {
            res.status(404).send("Not found");
        }
    } catch (error) {
        console.log();
        res.send(error)
    }
});
postsRouter.post("/:username", passport.authenticate('jwt'), async (req, res) => {
    try {
        if(req.user.username !== req.params.username) res.status(404).send('User not found')
        const post = {...req.body, username: req.params.username};
        const newPost = await Post.create(post);
        newPost.save();
        res.send(newPost);
    } catch (error) {
        res.status(500).send(error);
    }
});

postsRouter.put("/:postId", passport.authenticate('jwt'), async (req, res) => {
    try {
        const post = await Post.findOne({_id: req.params.postId})
        if(req.user.username !== post.username) res.status(404).send('User not found')
        const newPost = await Post.findOneAndUpdate(
            {_id: req.params.postId},
            {$set: {...req.body}},
            {new: true}
        );
        res.send(newPost);
    } catch (error) {
        res.status(400).send(error);
    }
});

postsRouter.delete("/:postId",passport.authenticate('jwt'), async (req, res) => {
    try {
        const post = await Post.findOne({_id: req.params.postId})
        if(req.user.username !== post.username) res.status(404).send('User not found')
        await Post.findOneAndDelete({_id: req.params.postId});
        res.send(post);
    } catch (error) {
        res.status(400).send(error);
    }
});

const upload = multer({});
postsRouter.post("/:postId/picture",passport.authenticate('jwt'), upload.single("image"), async (req, res) => {
    //console.log(req);
    try {
        if(req.user.username !== req.params.username) res.status(404).send('User not found')
        const imgDest = path.join(__dirname, "../../../image/" + req.params.postId + req.file.originalname);
        const imgDestination = req.protocol + "://" + req.get("host") + "/image/" + req.params.postId + req.file.originalname;
        await fs.writeFileSync(imgDest, req.file.buffer);
        console.log(imgDestination);
        const exp = await Post.findOneAndUpdate({_id: req.params.postId}, {image: imgDestination}, {
            new: true,
            useFindAndModify: false
        });
        res.send(exp)
    } catch (err) {
        console.log(err);
        res.send(err)
    }
});

postsRouter.post("/likes/:postId",passport.authenticate('jwt'), async(req,res) => {
    const userLike = await Post.findOne({_id: req.params.postId })
    const likesPart = userLike.likes
    if(likesPart.some(like => like.username == req.user.username)){
        const newPost = await Post.findOneAndUpdate({_id: req.params.postId}, {$pull: { "likes" : {userId: req.user._id} }, $inc : {likesTotal: -1}}, {useFindAndModify: false})
        res.send(newPost)
    } else {
        const newPost = await Post.findOneAndUpdate({_id: req.params.postId}, {$push: { "likes" : {userId: req.user._id, username: req.user.username} }, $inc : {likesTotal: 1}}, {useFindAndModify: false})
        res.send(newPost)
    }
})

postsRouter.get("/:id/comment", async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.comment);
        if (comment) {
            res.send(comment);
        } else {
            res.status(404).send("Not found");
        }
    } catch (error) {
        console.log();
        res.send(error)
    }
});
postsRouter.post("/:id/comment",passport.authenticate('jwt'), async (req, res) => {
    try {
        const post = await Post.findOne({_id: req.params.id});
        if(req.user.username !== post.username) res.status(404).send('User not found')
        const comment = await Comment.create({comment: req.body.comment, postedBy: req.user._id});
        // const comment = {...req.body, username: req.user.username};
        // const newComment = await Comment.create(comment);
        //console.log(req.body);
        post.comments.push(comment._id);
        console.log(post);
        post.save();
        res.send(post);
    } catch (error) {
        res.status(500).send(error);
    }
});
postsRouter.put("/:id/comment/:commentId",passport.authenticate('jwt'), async (req, res) => {
    try {
        const post = await Post.findOne({_id: req.params.id});
        if(req.user.username !== post.username) res.status(404).send('User not found')
        const comment = await Comment.findOneAndUpdate(
            {_id: req.params.commentId},
            {$set: {...req.body}},
            {new: true}
        );
        res.send(comment);
    } catch (error) {
        res.status(400).send(error);
    }
});
postsRouter.delete("/:id/comment/:commentId",passport.authenticate('jwt'), async (req, res) => {
    try {
        const post = await Post.findOne({_id: req.params.id});
        if(req.user.username !== post.username) res.status(404).send('User not found')
        const comment = await Comment.findOneAndDelete({_id: req.params.commentId});
        res.send(comment);
    } catch (error) {
        res.status(400).send(error);
    }
});

module.exports = postsRouter;