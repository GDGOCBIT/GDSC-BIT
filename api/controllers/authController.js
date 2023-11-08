const User = require('../models/userModel.js');
const bcrypt = require('bcryptjs');
const sendToken = require('../utils/sendToken.js');
const generateOTP = require('../utils/generateOTP.js');
const sendOTP = require('../mail/sendOTP.js');
const getDataUrl = require('../middleware/dataURL.js');
const { v2 } = require('cloudinary');

exports.userRegisterCredential = async (req, res) => {
    try {
        const { email, password } = req.body;

        let user = await User.findOne({ email });
        if (user && user.isVerified === true) {
            return res.status(400).json({
                success: false,
                msg: "User already exists!",
            });
        }

        const encryptedPassword = await bcrypt.hash(password, 10);
        const randomOTP = generateOTP(5);
        const otpCreatedAt = new Date();

        if (user && user.isVerified === false) {
            user = await User.findByIdAndUpdate(user._id, {
                email,
                password: encryptedPassword,
                registerOTP: randomOTP,
                otpCreatedAt
            });
        }
        else {
            user = await User.create({
                email,
                password: encryptedPassword,
                registerOTP: randomOTP,
                otpCreatedAt
            });
        }

        await sendOTP({
            email,
            subject: "Verify Account | GDSC Bengal Institute of Technology",
            message: `Here's your OTP: ${randomOTP}`
        });

        await sendToken(false, user, 200, "An OTP has been sent to your email!", res);
    }
    catch (error) {
        res.status(500).json({
            success: false,
            msg: "Something went wrong... Try again later!"
        });
    }
}

exports.userRegisterResendOTP = async (req, res) => {
    try {
        const randomOTP = generateOTP(5);
        const otpCreatedAt = new Date();

        await User.findByIdAndUpdate(req.user._id, {
            registerOTP: randomOTP,
            otpCreatedAt
        });
        await sendOTP({
            email: req.user.email,
            subject: "Verify Account | GDSC Bengal Institute of Technology",
            message: `Here's your OTP: ${randomOTP}`
        });

        res.status(200).json({
            success: true,
            msg: "OTP resent to your email!",
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            msg: "Something went wrong... Try again later!"
        });
    }
}

exports.userRegisterVerifyOTP = async (req, res) => {
    try {
        const otp = req.headers["otp"];

        const otpCreatedAt = new Date(req.user.otpCreatedAt);
        const currentTime = new Date();
        const diffMinutes = (currentTime - otpCreatedAt) / 1000 / 60;

        if (diffMinutes > 30) {
            await User.updateOne({ _id: req.user._id }, {
                $unset: {
                    registerOTP: 1,
                    otpCreatedAt: 1
                }
            });
            return res.status(400).json({
                success: false,
                msg: "OTP has expired... Try again!",
            });
        }

        if (req.user.registerOTP !== otp) {
            return res.status(400).json({
                success: false,
                msg: "OTP doesn't match... Try again!",
            });
        }

        await User.updateOne({ _id: req.user._id }, {
            $unset: {
                registerOTP: 1,
                otpCreatedAt: 1
            }
        });

        res.status(200).json({
            success: true,
            msg: "OTP verified!",
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            msg: "Something went wrong... Try again later!"
        });
    }
}

exports.userRegisterDetails = async (req, res) => {
    try {
        const { firstName, lastName } = req.body;
        const file = req.file;
        let user;

        if (file) {
            if (req.user.avatar.public_id) {
                await v2.api.delete_resources(
                    [req.user.avatar.public_id],
                    { type: 'upload', resource_type: 'image' }
                );
            }
            const fileURL = getDataUrl(file);
            const userImage = await v2.uploader.upload(fileURL.content, { folder: "BIT/Account" });
            user = await User.findByIdAndUpdate(req.user._id, {
                authType: "login",
                firstName,
                lastName,
                avatar: {
                    public_id: userImage.public_id,
                    url: userImage.secure_url,
                },
                isVerified: true
            });

            return res.status(200).json({
                success: true,
                msg: "Your account is registered successfully!"
            });
        }
        user = await User.findByIdAndUpdate(req.user._id, { authType: "login", firstName, lastName, isVerified: true });

        res.status(200).json({
            success: true,
            msg: "Your account is registered successfully!"
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            msg: "Something went wrong... Try again later!"
        });
    }
}

exports.userLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email })
            .select("+password")
            .where({ isVerified: true });

        if (!user) {
            return res.status(400).json({
                success: false,
                msg: "User is not registered!",
            });
        }

        if (user.password) {
            const isPasswordMatched = await user.comparePassword(password);

            if (!isPasswordMatched) {
                return res.status(400).json({
                    success: false,
                    msg: "Invalid credential!",
                });
            }
        }
        else if (user.googleId) {
            return res.status(400).json({
                success: false,
                msg: "Credentials associated with your Google account! Sign in with Google to proceed!",
            });
        }
        else if (user.linkedinId) {
            return res.status(400).json({
                success: false,
                msg: "Credentials associated with your LinkedIn account! Sign in with LinkedIn to proceed!",
            });
        }

        await sendToken(true, user, 201, "Login success!", res);
    }
    catch (error) {
        res.status(500).json({
            success: false,
            msg: "Something went wrong... Try again later!"
        });
    }
}

exports.loadUser = async (req, res) => {
    try {
        res.status(200).json({
            success: true,
            user: req.user,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            msg: "Something went wrong... Try again later!"
        });
    }
}

exports.forgotEmailVerify = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email }).where({ isVerified: true });
        if (!user) {
            return res.status(400).json({
                success: false,
                msg: "User isn't registered yet!",
            });
        }

        if (user.password) {
            const randomOTP = generateOTP(5);
            const otpCreatedAt = new Date();

            await User.findByIdAndUpdate({ _id: user._id }, {
                forgotOTP: randomOTP,
                otpCreatedAt
            });
            await sendOTP({
                email,
                subject: "Forgot Password | GDSC Bengal Institute of Technology",
                message: `Here's your OTP: ${randomOTP}`
            });

            res.status(200).json({
                success: true,
                msg: "OTP sent to your mail!",
            });
        }
        else if (user.googleId) {
            return res.status(400).json({
                success: false,
                msg: "Sign in with Google to proceed!",
            });
        }
        else if (user.linkedinId) {
            return res.status(400).json({
                success: false,
                msg: "Sign in with LinkedIn to proceed!",
            });
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            msg: "Something went wrong... Try again later!"
        });
    }
}

exports.forgotResendOTP = async (req, res) => {
    try {
        const { email } = req.body;
        const randomOTP = generateOTP(5);
        const otpCreatedAt = new Date();

        const user = await User.findOneAndUpdate({ email }, {
            forgotOTP: randomOTP,
            otpCreatedAt
        }).where({ isVerified: true });
        if (!user) {
            return res.status(400).json({
                success: false,
                msg: "User isn't registered yet!",
            });
        }

        await sendOTP({
            email: email,
            subject: "Forgot Password | GDSC Bengal Institute of Technology",
            message: `Here's your OTP: ${randomOTP}`
        });

        res.status(200).json({
            success: true,
            msg: "OTP resent to your email!",
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            msg: "Something went wrong... Try again later!"
        });
    }
}

exports.forgotOTPVerify = async (req, res) => {
    try {
        const otp = req.headers["otp"];
        const email = req.headers["email"];

        const user = await User.findOne({ email }).where({ isVerified: true });

        const otpCreatedAt = new Date(user.otpCreatedAt);
        const currentTime = new Date();
        const diffMinutes = (currentTime - otpCreatedAt) / 1000 / 60;

        if (diffMinutes > 30) {
            await User.updateOne({ _id: user._id }, {
                $unset: {
                    forgotOTP: 1,
                    otpCreatedAt: 1
                }
            });
            return res.status(400).json({
                success: false,
                msg: "OTP has expired... Try again!",
            });
        }

        if (user.forgotOTP !== otp) {
            return res.status(400).json({
                success: false,
                msg: "OTP doesn't match... Try again!",
            });
        }

        await User.updateOne({ _id: user._id }, {
            $unset: {
                forgotOTP: 1,
                otpCreatedAt: 1
            }
        });
        const forgotToken = user.getForgotToken();
        await user.save();

        res.status(200).json({
            success: true,
            msg: "OTP verified!",
            forgotToken
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            msg: "Something went wrong... Try again later!"
        });
    }
}

exports.forgotResetPassword = async (req, res) => {
    try {
        const { password } = req.body;
        const encryptedPassword = await bcrypt.hash(password, 10);

        // await User.findByIdAndUpdate(req.user._id, {
        //     password: encryptedPassword,
        //     $unset: { jwtForgotToken: 1 }
        // });
        // await User.findByIdAndUpdate(req.user._id, {
        //     $unset: { jwtForgotToken: 1 }
        // });

        await Promise.all([
            await User.findByIdAndUpdate(req.user._id, {
                password: encryptedPassword,
                $unset: { jwtForgotToken: 1 }
            }),
            await User.findByIdAndUpdate(req.user._id, {
                $unset: { jwtForgotToken: 1 }
            })
        ]);

        res.status(200).json({
            success: true,
            msg: "Password successfully changed!",
        });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            msg: "Something went wrong... Try again later!"
        });
    }
}