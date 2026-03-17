import styled from '@emotion/styled'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from './Button'

export const AVATARS = ['🐵', '🐶', '🦊', '🐱', '🦁', '🐷', '🐭', '🐼', '🐸', '🐙']

const LANGUAGES = [
  { code: 'en', flag: '🇬🇧', label: 'EN' },
  { code: 'it', flag: '🇮🇹', label: 'IT' },
] as const

const TitleScreenContainer = styled('main')`
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.25);
  flex: 1;
`

const TitleScreenContent = styled('div')`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  background-color: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 1rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  padding: 3rem;
  max-width: 540px;
  width: 100%;

  @media (max-height: 600px) {
    gap: 1rem;
    padding: 2rem;
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

const ButtonStack = styled('div')`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
  align-items: stretch;
`

const ResumeButtonContent = styled('span')`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
`

const ResumeScores = styled('span')`
  font-size: 1rem;
  letter-spacing: 0.05em;
`

const ResumeLabel = styled('span')`
  font-size: 0.75rem;
  opacity: 0.8;
  letter-spacing: 0.1em;
`

const LangRow = styled('div')`
  position: absolute;
  top: 1rem;
  right: 1rem;
  display: flex;
  align-items: center;
  gap: 0.375rem;
`

const LangButton = styled('button')`
  font-size: 1.25rem;
  height: 2.25rem;
  padding: 0 0.75rem;
  border-radius: 0.5rem;
  border: 2px solid rgba(255, 255, 255, 0.2);
  background-color: rgba(255, 255, 255, 0.05);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  transition: border-color 0.15s, background-color 0.15s, transform 0.1s;
  line-height: 1;

  &:hover {
    border-color: rgba(255, 255, 255, 0.5);
    background-color: rgba(255, 255, 255, 0.15);
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }
`

const LangButtonText = styled('span')`
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.05em;
`

interface SavedGame {
  avatars: string[]
  wins: readonly number[]
}

interface TitleScreenProps {
  loadingProgress: number
  onStart: (avatar: string, playerCount: 2 | 3) => void
  savedGame?: SavedGame
  onResume?: () => void
}

export const TitleScreen = ({ loadingProgress, onStart, savedGame, onResume }: TitleScreenProps) => {
  const { t, i18n } = useTranslation()
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
              <AvatarPickerLabel>{t('chooseAvatar')}</AvatarPickerLabel>
              <AvatarGrid>
                {AVATARS.map((emoji) => (
                  <AvatarButton
                    key={emoji}
                    selected={selectedAvatar === emoji}
                    onClick={() => setSelectedAvatar(emoji)}
                    aria-label={t('selectAvatar', { emoji })}
                    aria-pressed={selectedAvatar === emoji}
                  >
                    {emoji}
                  </AvatarButton>
                ))}
              </AvatarGrid>
            </AvatarSection>
            <ButtonStack>
              {savedGame && onResume && (
                <Button onClick={onResume}>
                  <ResumeButtonContent>
                    <ResumeScores>
                      {savedGame.avatars.map((avatar, i) => `${avatar} ${savedGame.wins[i]}`).join(' · ')}
                    </ResumeScores>
                    <ResumeLabel>{t('resume')}</ResumeLabel>
                  </ResumeButtonContent>
                </Button>
              )}
              <Button onClick={() => onStart(selectedAvatar, 2)}>{t('newTwoPlayerGame')}</Button>
              <Button onClick={() => onStart(selectedAvatar, 3)}>{t('newThreePlayerGame')}</Button>
            </ButtonStack>
            <LangRow>
              {LANGUAGES.filter(({ code }) => code !== i18n.language).map(({ code, flag, label }) => (
                <LangButton key={code} onClick={() => i18n.changeLanguage(code)} aria-label={label}>
                  {flag} <LangButtonText>{label}</LangButtonText>
                </LangButton>
              ))}
            </LangRow>
          </>
        )}
      </TitleScreenContent>
    </TitleScreenContainer>
  )
}
