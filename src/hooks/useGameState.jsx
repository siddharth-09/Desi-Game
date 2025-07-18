import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export const useGameState = () => {
  const [gameState, setGameState] = useState({
    room: null,
    bullets: [],
    currentPlayer: null,
    players: [],
    gameStatus: 'waiting', // waiting, playing, finished
    currentTurn: null,
    playerHealth: { player1: 3, player2: 3 },
    currentBulletIndex: 0
  })

  const [playerId, setPlayerId] = useState(null)

  useEffect(() => {
    // Generate a unique player ID
    const id = Math.random().toString(36).substring(2, 15)
    setPlayerId(id)
  }, [])

  const generateBullets = (count = 6) => {
    const bullets = []
    const realBullets = Math.floor(count / 2) + Math.floor(Math.random() * 2) // 3-4 real bullets
    
    for (let i = 0; i < count; i++) {
      bullets.push(i < realBullets ? 'real' : 'fake')
    }
    
    // Shuffle the bullets
    for (let i = bullets.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[bullets[i], bullets[j]] = [bullets[j], bullets[i]]
    }
    
    return bullets
  }

  const createRoom = async () => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase()
    const bullets = generateBullets()
    
    const { data, error } = await supabase
      .from('game_rooms')
      .insert({
        room_id: roomId,
        player1_id: playerId,
        bullets: bullets,
        game_status: 'waiting',
        current_turn: playerId,
        player1_health: 3,
        player2_health: 3,
        current_bullet_index: 0
      })
      .select()

    if (error) {
      console.error('Error creating room:', error)
      return null
    }

    setGameState(prev => ({
      ...prev,
      room: data[0],
      bullets: bullets,
      players: [playerId],
      currentPlayer: playerId,
      currentTurn: playerId
    }))

    return roomId
  }

  const joinRoom = async (roomId) => {
    // First check if room exists and has space
    const { data: room, error: fetchError } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('room_id', roomId)
      .single()

    if (fetchError || !room || room.player2_id) {
      console.error('Room not found or full')
      return false
    }

    // Join the room
    const { data, error } = await supabase
      .from('game_rooms')
      .update({
        player2_id: playerId,
        game_status: 'playing'
      })
      .eq('room_id', roomId)
      .select()

    if (error) {
      console.error('Error joining room:', error)
      return false
    }

    setGameState(prev => ({
      ...prev,
      room: data[0],
      bullets: room.bullets,
      players: [room.player1_id, playerId],
      currentPlayer: playerId,
      gameStatus: 'playing'
    }))

    return true
  }

  const shoot = async (target) => {
    if (!gameState.room || gameState.currentTurn !== playerId) return

    const currentBullet = gameState.bullets[gameState.currentBulletIndex]
    const isShootingSelf = target === 'self'
    const shooter = playerId
    const targetPlayer = isShootingSelf ? playerId : (playerId === gameState.room.player1_id ? gameState.room.player2_id : gameState.room.player1_id)

    // Determine animation trigger
    let animationTrigger
    if (isShootingSelf) {
      animationTrigger = currentBullet === 'real' ? 'Real_MtoM' : 'Fake_MtoM'
    } else {
      animationTrigger = currentBullet === 'real' ? 'Real_MtoO' : 'Fake_MtoO'
    }

    // Calculate new health
    let newPlayer1Health = gameState.room.player1_health
    let newPlayer2Health = gameState.room.player2_health

    if (currentBullet === 'real') {
      if (targetPlayer === gameState.room.player1_id) {
        newPlayer1Health -= 1
      } else {
        newPlayer2Health -= 1
      }
    }

    // Determine next turn
    let nextTurn
    if (currentBullet === 'fake' && isShootingSelf) {
      nextTurn = playerId // Keep turn if shot self with fake bullet
    } else {
      nextTurn = playerId === gameState.room.player1_id ? gameState.room.player2_id : gameState.room.player1_id
    }

    // Check if game is finished
    const gameFinished = newPlayer1Health <= 0 || newPlayer2Health <= 0

    // Update database
    const { error } = await supabase
      .from('game_rooms')
      .update({
        current_bullet_index: gameState.currentBulletIndex + 1,
        current_turn: gameFinished ? null : nextTurn,
        player1_health: newPlayer1Health,
        player2_health: newPlayer2Health,
        game_status: gameFinished ? 'finished' : 'playing',
        last_action: {
          shooter,
          target: targetPlayer,
          bullet: currentBullet,
          animation: animationTrigger,
          timestamp: new Date().toISOString()
        }
      })
      .eq('room_id', gameState.room.room_id)

    if (error) {
      console.error('Error updating game state:', error)
    }

    return {
      bullet: currentBullet,
      animation: animationTrigger,
      targetPlayer,
      newHealth: { player1: newPlayer1Health, player2: newPlayer2Health }
    }
  }

  const subscribeToRoom = (roomId) => {
    const channel = supabase
      .channel(`room_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_rooms',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          const updatedRoom = payload.new
          setGameState(prev => ({
            ...prev,
            room: updatedRoom,
            bullets: updatedRoom.bullets,
            gameStatus: updatedRoom.game_status,
            currentTurn: updatedRoom.current_turn,
            playerHealth: {
              player1: updatedRoom.player1_health,
              player2: updatedRoom.player2_health
            },
            currentBulletIndex: updatedRoom.current_bullet_index,
            players: [updatedRoom.player1_id, updatedRoom.player2_id].filter(Boolean)
          }))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  return {
    gameState,
    playerId,
    createRoom,
    joinRoom,
    shoot,
    subscribeToRoom
  }
}
