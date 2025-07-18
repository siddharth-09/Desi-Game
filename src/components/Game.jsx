import { useState, useEffect } from 'react'
import { useGameState } from '../hooks/useGameState'
import RiveAnimation from './RiveAnimation'

const Game = () => {
  const [roomInput, setRoomInput] = useState('')
  const [currentRoom, setCurrentRoom] = useState('')
  const [lastAction, setLastAction] = useState(null)
  
  const { 
    gameState, 
    playerId, 
    createRoom, 
    joinRoom, 
    shoot, 
    subscribeToRoom 
  } = useGameState()

  useEffect(() => {
    if (gameState.room) {
      const unsubscribe = subscribeToRoom(gameState.room.room_id)
      return unsubscribe
    }
  }, [gameState.room, subscribeToRoom])

  useEffect(() => {
    // Update last action when room state changes
    if (gameState.room?.last_action) {
      setLastAction(gameState.room.last_action)
    }
  }, [gameState.room?.last_action])

  const handleCreateRoom = async () => {
    const roomId = await createRoom()
    if (roomId) {
      setCurrentRoom(roomId)
    }
  }

  const handleJoinRoom = async () => {
    if (!roomInput.trim()) return
    const success = await joinRoom(roomInput.toUpperCase())
    if (success) {
      setCurrentRoom(roomInput.toUpperCase())
    } else {
      alert('Room not found or room is full!')
    }
  }

  const handleShoot = async (target) => {
    const result = await shoot(target)
    if (result) {
      console.log('Shot result:', result)
    }
  }

  const isMyTurn = gameState.currentTurn === playerId
  const isPlayer1 = playerId === gameState.room?.player1_id
  const opponentHealth = isPlayer1 ? gameState.playerHealth.player2 : gameState.playerHealth.player1
  const myHealth = isPlayer1 ? gameState.playerHealth.player1 : gameState.playerHealth.player2

  if (!gameState.room) {
    return (
      <div className="lobby">
        <h1>Buckshot Roulette</h1>
        
        <div className="lobby-section">
          <h2>Create Room</h2>
          <button onClick={handleCreateRoom}>
            Create New Room
          </button>
        </div>

        <div className="lobby-section">
          <h2>Join Room</h2>
          <input
            type="text"
            placeholder="Enter Room ID"
            value={roomInput}
            onChange={(e) => setRoomInput(e.target.value)}
            maxLength={6}
          />
          <button onClick={handleJoinRoom}>
            Join Room
          </button>
        </div>
      </div>
    )
  }

  if (gameState.gameStatus === 'waiting') {
    return (
      <div className="waiting">
        <h2>Room: {currentRoom}</h2>
        <p>Waiting for another player to join...</p>
        <p>Share this room ID with your friend!</p>
      </div>
    )
  }

  if (gameState.gameStatus === 'finished') {
    const winner = gameState.playerHealth.player1 <= 0 ? 'Player 2' : 'Player 1'
    const iWon = (winner === 'Player 1' && isPlayer1) || (winner === 'Player 2' && !isPlayer1)
    
    return (
      <div className="game-over">
        <h2>{iWon ? 'You Won!' : 'You Lost!'}</h2>
        <button onClick={() => window.location.reload()}>
          Play Again
        </button>
      </div>
    )
  }

  return (
    <div className="game">
      <div className="game-header">
        <h2>Room: {currentRoom}</h2>
        <div className="health-display">
          <div className="my-health">
            My Health: {myHealth}
          </div>
          <div className="opponent-health">
            Opponent Health: {opponentHealth}
          </div>
        </div>
      </div>

      <div className="game-content">
        <div className="animation-container">
          <RiveAnimation
            lastAction={lastAction}
            playerId={playerId}
            onAnimationTrigger={(trigger) => console.log('Animation triggered:', trigger)}
          />
        </div>

        <div className="game-info">
          <div className="turn-indicator">
            {isMyTurn ? "Your Turn" : "Opponent's Turn"}
          </div>
          
          <div className="bullet-info">
            Bullets remaining: {gameState.bullets.length - gameState.currentBulletIndex}
          </div>

          {isMyTurn && (
            <div className="action-buttons">
              <button 
                onClick={() => handleShoot('self')}
                className="shoot-self-btn"
              >
                Shoot Myself
              </button>
              <button 
                onClick={() => handleShoot('opponent')}
                className="shoot-opponent-btn"
              >
                Shoot Opponent
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Game
