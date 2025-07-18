import { useRive, useStateMachineInput } from '@rive-app/react-canvas'
import { useEffect } from 'react'

const RiveAnimation = ({ onAnimationTrigger, lastAction, playerId }) => {
  const { rive, RiveComponent } = useRive({
    src: '/DesiGame.riv', // Update this path to your actual rive file
    stateMachines: 'State Machine 1', // Update this to your state machine name
    autoplay: true,
  })

  // Get inputs for triggering animations
  const fakeMtoM = useStateMachineInput(rive, 'State Machine 1', 'Fake_MtoM');
  const realMtoM = useStateMachineInput(rive, 'State Machine 1', 'Real_MtoM');
  const fakeMtoO = useStateMachineInput(rive, 'State Machine 1', 'Fake_MtoO');
  const realMtoO = useStateMachineInput(rive, 'State Machine 1', 'Real_MtoO');
  const fakeOtoO = useStateMachineInput(rive, 'State Machine 1', 'Fake_OtoO');
  const realOtoO = useStateMachineInput(rive, 'State Machine 1', 'Real_OtoO');
  const realOtoM = useStateMachineInput(rive, 'State Machine 1', 'Real_OtoM');
  const fakeOtoM = useStateMachineInput(rive, 'State Machine 1', 'Fake_OtoM');

  useEffect(() => {
    if (!lastAction || !rive) return

    const { shooter, target, bullet } = lastAction

    // Determine the perspective for this player
    let triggerName = ''
    
    if (shooter === playerId) {
      // I am shooting
      if (target === playerId) {
        // Shooting myself
        triggerName = bullet === 'real' ? 'Real_MtoM' : 'Fake_MtoM'
      } else {
        // Shooting opponent
        triggerName = bullet === 'real' ? 'Real_MtoO' : 'Fake_MtoO'
      }
    } else {
      // Opponent is shooting
      if (target === playerId) {
        // Opponent shooting me
        triggerName = bullet === 'real' ? 'Real_OtoM' : 'Fake_OtoM'
      } else {
        // Opponent shooting themselves (from my perspective)
        triggerName = bullet === 'real' ? 'Real_OtoO' : 'Fake_OtoO'
      }
    }

    // Trigger the appropriate animation
    console.log('Triggering animation:', triggerName)
    
    // Fire the specific trigger based on the trigger name
    switch (triggerName) {
      case 'Fake_MtoM':
        fakeMtoM && fakeMtoM.fire()
        break
      case 'Real_MtoM':
        realMtoM && realMtoM.fire()
        break
      case 'Fake_MtoO':
        fakeMtoO && fakeMtoO.fire()
        break
      case 'Real_MtoO':
        realMtoO && realMtoO.fire()
        break
      case 'Fake_OtoM':
        fakeOtoM && fakeOtoM.fire()
        break
      case 'Real_OtoM':
        realOtoM && realOtoM.fire()
        break
      case 'Fake_OtoO':
        fakeOtoO && fakeOtoO.fire()
        break
      case 'Real_OtoO':
        realOtoO && realOtoO.fire()
        break
      default:
        console.warn('Unknown trigger:', triggerName)
    }

    // Call callback if provided
    if (onAnimationTrigger) {
      onAnimationTrigger(triggerName)
    }

  }, [lastAction, rive, playerId, fakeMtoM, realMtoM, fakeMtoO, realMtoO, fakeOtoM, realOtoM, fakeOtoO, realOtoO, onAnimationTrigger])

  return (
    <div className="rive-container">
      <RiveComponent />
    </div>
  )
}

export default RiveAnimation
