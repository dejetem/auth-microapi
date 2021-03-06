const User = require('../models/user');
const userRouter = require('express').Router();
const session = require('../app')

const { 
  registerValidation, 
  loginValidation, 
  forgotValidation, 
  resetPasswordValidation 
} = require('../utils/validation/joiValidation');
const { auth } = require('../utils/middleware');
const { createVerificationLink } = require('../utils/EmailVerification');
const { userForgotPassword, userResetPassword } = require('../controllers/auth');


userRouter.get('/user/active', auth, (req, res) => {
  res.status(200).json({
    _id: req.user.id,
    isAdmin: req.user.isEmailVerified,
    isAuth: true,
    email: req.user.email,
    username: req.user.username,
  });
});


userRouter.post('/register', registerValidation(), async (request, response) => {
  // Register as guest
  const { email } = request.body;

  // Check if user email is taken in DB
  let user = await User.findOne({ email });

  if (user) {
    return response.status(403).json({
      success: false,
      message: 'Email address already in use',
    });
  }

  user = new User({ ...request.body });
  user = await user.save();


  // Send a confirmation link to email
  const mailStatus = await createVerificationLink(user, request);
  console.log(mailStatus);
  const { verificationUrl } = mailStatus;
  response.cookie('userId', user._id)
  return response.status(201).json({
    success: true,
    verificationUrl,
    message: 'Account created successfully',
    data: { ...user.toJSON() },
  });
});

userRouter.post('/login', loginValidation(), async (request, response) => {
  // Login as guest
  const { email, password } = request.body;
  

  // check if user has verified email
  

  // check if user exists in DB
  let user = await User.findOne({ email });

  if (!user) {
    return response.status(401).json({
      success: false,
      message: 'Invalid email or password',
    });
  }

  // check if password provided by user matches user password in DB
  const isMatch = await user.matchPasswords(password);
  // console.log(" isMatch", isMatch)

  if (!isMatch) {
    return response.status(401).json({
      success: false,
      message: 'Invalid email or password',
    });
  }
  // console.log(" isMatch", isMatch)

  // Send token in response cookie for user session
  let client = await user.generateToken();
  response.cookie('userId', user._id)
  response.cookie('w_authExp', client.tokenExp);
  response.cookie('w_auth', client.token).status(200).json({
    success: true,
    userId: client.id,
    token: client.token
  });
  /**req.session.login(userInfo, function(err) {
    if (err) {
       return res.status(500).send("There was an error logging in. Please try again later.");
    }
  });*/
});

/**userRouter.get('/logout', asyn (request, response) => {
  const query = {
    id: request.body.id
  };

  const update = {
    token: '',
    tokenExp: ''
  };

  await User.findOneAndUpdate(query, update);
  /**req.session.logout(userInfo, function(err) {
    if (err) {
       return res.status(500).send("There was an error loggingout. Please try again later.");
    }
  });
  if (req.cookies.user_sid && !req.session.user) {
    res.clearCookie('w_auth');        
  }
  //clearCookie('id');
  //req.session = null;
  response.clearCookie('w_authExp');
  response.clearCookie('w_auth');
  return response.status(200).send({
    success: true,
  });
});*/
userRouter.get('/logout', async (request, response) => {
  const query = {
    id: request.body.id
  };

  const update = {
    token: '',
    tokenExp: ''
  };

  await User.findOneAndUpdate(query, update);
  response.clearCookie('w_authExp',client.tokenExp);
  response.clearCookie('w_auth', client.token);
  response.clearCookie('userId', user._id)
  return response.status(200).send({
    success: true,
  });
});

userRouter.post('/forgot-password', forgotValidation(), userForgotPassword);

userRouter.patch('/reset-password/:token', resetPasswordValidation(), userResetPassword);

module.exports = userRouter;
