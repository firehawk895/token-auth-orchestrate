var express = require('express');
var config = require('./config.js');
var passport = require('passport');
var BearerStrategy = require('passport-http-bearer').Strategy;
var bcrypt = require('bcryptjs');
var Q = require('q');
var db = require('orchestrate')(config.db);
var bodyParser = require('body-parser');

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.post('/user/signup', function (req, res) {
    console.log(req.body);
    var hashedPassword = bcrypt.hashSync(req.body.password, 8);
    var user = {
        "username": req.body.username,
        "email": req.body.email,
        "password": hashedPassword,
        "avatar": "https://s3-ap-southeast-1.amazonaws.com/pyoopil-files/default_profile_photo-1.png"
    };

    db.put('users', user.email, user)
        .then(function () {
            console.log("USER: " + user + " has been created");
            res.sendStatus(200);
        })
        .fail(function (err) {
            console.log("PUT FAIL:" + err.body);
            res.sendStatus(503);
        });
});

app.post('/user/login', function (req, res) {
    console.log(req.body);
    var email = req.body.email;
    var password = req.body.password;

    db.get('users', email)
        .then(function (result) {
            console.log("User found");
            var hash = result.body.password;
            console.log(hash);
            console.log(bcrypt.compareSync(password, hash));
            if (bcrypt.compareSync(password, hash)) {
                //deferred.resolve(result.body);
                console.log("Logged in");
                res.sendStatus(200);
            } else {
                console.log("Incorrect password entered");
                res.sendStatus(503);
                //deferred.resolve(false);
            }
        }).fail(function (err) {
            if (err.body.message == 'The requested items could not be found.') {
                console.log("Unable to find user");
                res.sendStatus(404);
                //deferred.resolve(false);
            } else {
                //deferred.reject(new Error(err));
                res.sendStatus(400);
            }
        });
    res.send('hello authed world');
});

// -- auth/facebook
app.post('/user/auth/facebook', function (req, res) {
    res.send('hello authed world');
});

app.use(passport.initialize());
passport.use(new BearerStrategy({},
    function (token, done) {
        db.get('users', token)
            .then(function (user) {
                return done(null, user);
            }).fail(function (err) {
                return done(null, false);
            });
    }));

var authedRouter = express.Router();
authedRouter.use(passport.authenticate('bearer', {session: false}));

app.use('/authtest', authedRouter);

authedRouter.get('/test', function (req, res) {
    res.send('hello authed world');
});

app.listen(8080);
console.log("listening on port 8080");