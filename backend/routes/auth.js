import express from "express";
import prisma from "../prismaClient.js";

const router = express.Router();

router.post("/google", async (req, res) => {
  try {
    const { name, email, picture } = req.body;

    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          name,
          email,
          picture,
        },
      });
    }

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Server Error",
    });
  }
});

export default router;