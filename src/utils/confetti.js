import confetti from "canvas-confetti";

export const launchConfetti = () => {
  confetti({
    particleCount: 150,
    spread: 70,
    origin: { y: 0.6 },
    zIndex: 1000,
  });
};
