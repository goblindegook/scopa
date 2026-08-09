import styled from '@emotion/styled'
import { useTranslation } from 'react-i18next'
import { AVATARS, AvatarPicker } from './AvatarPicker'
import { Button } from './Button'
import { DifficultyPicker } from './DifficultyPicker'
import type { Difficulty } from './OfflineMode'
import { useLocalStorage } from './useLocalStorage'

const LANGUAGES = [
  { code: 'en', flag: '🇬🇧', label: 'EN' },
  { code: 'it', flag: '🇮🇹', label: 'IT' },
] as const

const TitleScreenContainer = styled('main')`
  position: fixed;
  inset: 0;
  z-index: 10001;
  overflow-y: auto;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.6);
  min-height: 100vh;
  min-height: 100dvh;
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

const ButtonStack = styled('div')`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
  align-items: stretch;

  & button {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 3.5rem;
  }
`

const ResumeSection = styled('div')`
  display: flex;
  width: 100%;
  margin-bottom: 1rem;

  & > button {
    width: 100%;
  }
`

const LocalGameRow = styled('div')`
  display: flex;
  gap: 0.75rem;
  width: 100%;

  & > button {
    flex: 1;
  }
`

const OnlineGameSection = styled('div')`
  display: flex;
  width: 100%;

  & > button {
    width: 100%;
  }
`

const StackedButtonContent = styled('span')`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
`

const StackedButtonMain = styled('span')`
  font-size: 1rem;
  letter-spacing: 0.05em;
`

const StackedButtonCaption = styled('span')`
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

export interface ResumableGame {
  readonly kind: 'local' | 'online'
  readonly avatars: readonly string[]
  readonly score: readonly number[]
  readonly onResume: () => void
}

const StackedButton = ({ main, caption, onClick }: { main: string; caption: string; onClick: () => void }) => (
  <Button onClick={onClick}>
    <StackedButtonContent>
      <StackedButtonMain>{main}</StackedButtonMain>
      <StackedButtonCaption>{caption}</StackedButtonCaption>
    </StackedButtonContent>
  </Button>
)

interface TitleScreenProps {
  loadingProgress: number
  onStart: (avatar: string, playerCount: 2 | 3, difficulty: Difficulty) => void
  resume?: ResumableGame
  onStartMultiplayer?: (avatar: string) => void
}

export const TitleScreen = ({ loadingProgress, onStart, resume, onStartMultiplayer }: TitleScreenProps) => {
  const { t, i18n } = useTranslation()
  const [selectedAvatar, setSelectedAvatar] = useLocalStorage('last-avatar', AVATARS[0])
  const [difficulty, setDifficulty] = useLocalStorage<Difficulty>('last-difficulty', 'normal')

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
            <AvatarPicker selected={selectedAvatar} onSelect={setSelectedAvatar} />
            <DifficultyPicker selected={difficulty} onSelect={setDifficulty} />
            <ButtonStack>
              {resume && (
                <ResumeSection>
                  <StackedButton
                    main={resume.avatars.map((avatar, i) => `${avatar} ${resume.score[i] ?? 0}`).join(' \u00b7 ')}
                    caption={resume.kind === 'online' ? `${t('onlineGame')} \u00b7 ${t('resume')}` : t('resume')}
                    onClick={resume.onResume}
                  />
                </ResumeSection>
              )}
              <LocalGameRow>
                <StackedButton
                  main={t('newLocalGame')}
                  caption={t('twoPlayers')}
                  onClick={() => onStart(selectedAvatar, 2, difficulty)}
                />
                <StackedButton
                  main={t('newLocalGame')}
                  caption={t('threePlayers')}
                  onClick={() => onStart(selectedAvatar, 3, difficulty)}
                />
              </LocalGameRow>
              {onStartMultiplayer && (
                <OnlineGameSection>
                  <Button onClick={() => onStartMultiplayer(selectedAvatar)}>{t('vsFriends')}</Button>
                </OnlineGameSection>
              )}
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
