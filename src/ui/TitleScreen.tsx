import styled from '@emotion/styled'
import React from 'react'
import { Button } from './Button'

export const AVATARS = ['🐵', '🐶', '🦊', '🐱', '🦁', '🐷', '🐭', '🐼', '🐸', '🐙']

const TitleScreenContainer = styled('main')`
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.25);
  flex: 1;
`

const TitleScreenContent = styled('div')`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3rem;
  background-color: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 1rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  padding: 3rem;
  max-width: 540px;
  width: 100%;

  @media (max-height: 600px) {
    padding: 2rem;
    gap: 2rem;
  }
`

const Title = styled('h1')`
  color: white;
  font-size: 6rem;
  font-weight: 600;
  margin: 0;
  text-align: center;
  letter-spacing: 0.05em;
  text-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);

  @media (max-height: 600px) {
    font-size: 4rem;
  }
`

const ProgressBarContainer = styled('div')`
  width: 100%;
  height: 0.5rem;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 0.25rem;
  overflow: hidden;
`

const ProgressBarFill = styled('div')<{ progress: number }>`
  height: 100%;
  width: ${(props) => props.progress * 100}%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 0.25rem;
  transition: width 0.3s ease;
`

const AvatarPickerLabel = styled('p')`
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.875rem;
  margin: 0;
  letter-spacing: 0.05em;
  text-transform: uppercase;
`

const AvatarGrid = styled('div')`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.5rem;
`

const AvatarButton = styled('button')<{ selected: boolean }>`
  font-size: 1.75rem;
  width: 3rem;
  height: 3rem;
  border-radius: 0.5rem;
  border: 2px solid ${({ selected }) => (selected ? 'rgba(74, 222, 128, 0.9)' : 'rgba(255, 255, 255, 0.2)')};
  background-color: ${({ selected }) => (selected ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.05)')};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.15s, background-color 0.15s, transform 0.1s;
  line-height: 1;

  &:hover {
    border-color: rgba(255, 255, 255, 0.5);
    background-color: rgba(255, 255, 255, 0.15);
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.95);
  }
`

const AvatarSection = styled('div')`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  width: 100%;
`

const ButtonRow = styled('div')`
  display: flex;
  gap: 0.75rem;
  width: 100%;
  justify-content: center;
`

interface TitleScreenProps {
  loadingProgress: number
  onStart: (avatar: string) => void
  savedAvatar?: string
  onResume?: () => void
}

export const TitleScreen = ({ loadingProgress, onStart, savedAvatar, onResume }: TitleScreenProps) => {
  const [selectedAvatar, setSelectedAvatar] = React.useState(AVATARS[0])

  return (
    <TitleScreenContainer>
      <TitleScreenContent>
        <Title>Scopa</Title>
        {loadingProgress < 1 ? (
          <ProgressBarContainer>
            <ProgressBarFill progress={loadingProgress} />
          </ProgressBarContainer>
        ) : (
          <>
            <AvatarSection>
              <AvatarPickerLabel>Choose your avatar</AvatarPickerLabel>
              <AvatarGrid>
                {AVATARS.map((emoji) => (
                  <AvatarButton
                    key={emoji}
                    selected={selectedAvatar === emoji}
                    onClick={() => setSelectedAvatar(emoji)}
                    aria-label={`Select avatar ${emoji}`}
                    aria-pressed={selectedAvatar === emoji}
                  >
                    {emoji}
                  </AvatarButton>
                ))}
              </AvatarGrid>
            </AvatarSection>
            <ButtonRow>
              {savedAvatar && onResume && <Button onClick={onResume}>{savedAvatar} Resume</Button>}
              <Button onClick={() => onStart(selectedAvatar)}>New Game</Button>
            </ButtonRow>
          </>
        )}
      </TitleScreenContent>
    </TitleScreenContainer>
  )
}
