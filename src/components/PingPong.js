import React, { useEffect, useRef } from 'react';
import { Box } from '@mui/material';

const PingPong = () => {
  const canvasRef = useRef(null);
  const ballImageRef = useRef(new Image());
  const gameRef = useRef({
    ball: { x: 0, y: 0, dx: 4, dy: 4, radius: 20 },
    paddle: { x: 0, y: 0, width: 10, height: 100 },
    score: 0,
    gameOver: false
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const game = gameRef.current;

    // Load the ball image
    ballImageRef.current.src = '/Ramball.png';

    // Set canvas size
    canvas.width = 800;
    canvas.height = 400;

    // Initialize game state
    game.ball.x = canvas.width / 2;
    game.ball.y = canvas.height / 2;
    game.paddle.x = 50;
    game.paddle.y = canvas.height / 2 - game.paddle.height / 2;

    // Mouse movement handler
    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouseY = e.clientY - rect.top;
      game.paddle.y = Math.max(0, Math.min(canvas.height - game.paddle.height, mouseY - game.paddle.height / 2));
    };

    canvas.addEventListener('mousemove', handleMouseMove);

    // Game loop
    const gameLoop = () => {
      if (game.gameOver) return;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw paddle
      ctx.fillStyle = '#232946';
      ctx.fillRect(game.paddle.x, game.paddle.y, game.paddle.width, game.paddle.height);

      // Draw ball using the image
      const ballSize = game.ball.radius * 2;
      ctx.drawImage(
        ballImageRef.current,
        game.ball.x - game.ball.radius,
        game.ball.y - game.ball.radius,
        ballSize,
        ballSize
      );

      // Draw score
      ctx.fillStyle = '#232946';
      ctx.font = '24px Arial';
      ctx.fillText(`Score: ${game.score}`, 20, 30);

      // Move ball
      game.ball.x += game.ball.dx;
      game.ball.y += game.ball.dy;

      // Ball collision with top and bottom
      if (game.ball.y + game.ball.radius > canvas.height || game.ball.y - game.ball.radius < 0) {
        game.ball.dy = -game.ball.dy;
      }

      // Ball collision with paddle
      if (
        game.ball.x - game.ball.radius < game.paddle.x + game.paddle.width &&
        game.ball.y > game.paddle.y &&
        game.ball.y < game.paddle.y + game.paddle.height
      ) {
        game.ball.dx = -game.ball.dx;
        game.score += 1;
      }

      // Ball collision with right wall
      if (game.ball.x + game.ball.radius > canvas.width) {
        game.ball.dx = -game.ball.dx;
      }

      // Game over condition
      if (game.ball.x - game.ball.radius < 0) {
        game.gameOver = true;
        ctx.fillStyle = '#232946';
        ctx.font = '48px Arial';
        ctx.fillText('Game Over!', canvas.width / 2 - 100, canvas.height / 2);
        ctx.font = '24px Arial';
        ctx.fillText(`Final Score: ${game.score}`, canvas.width / 2 - 80, canvas.height / 2 + 40);
        ctx.fillText('Click to restart', canvas.width / 2 - 80, canvas.height / 2 + 80);
        return;
      }

      requestAnimationFrame(gameLoop);
    };

    // Start game loop
    gameLoop();

    // Click to restart handler
    const handleClick = () => {
      if (game.gameOver) {
        game.ball.x = canvas.width / 2;
        game.ball.y = canvas.height / 2;
        game.ball.dx = 4;
        game.ball.dy = 4;
        game.score = 0;
        game.gameOver = false;
        gameLoop();
      }
    };

    canvas.addEventListener('click', handleClick);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('click', handleClick);
    };
  }, []);

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2 }}>
      <canvas
        ref={canvasRef}
        style={{
          border: '2px solid #232946',
          borderRadius: '8px',
          backgroundColor: '#f4f6fa'
        }}
      />
    </Box>
  );
};

export default PingPong; 