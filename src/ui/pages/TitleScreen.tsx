import styled from '@emotion/styled'
import { useTranslation } from 'react-i18next'
import type { PlayerCount } from '../../engine/sides'
import { Button } from '../atoms/Button'
import { ModalOverlay, ModalPanel } from '../atoms/ModalOverlay'
import { AVATARS, AvatarPicker } from '../molecules/AvatarPicker'
import { DifficultyPicker } from '../molecules/DifficultyPicker'
import type { Difficulty } from '../OfflineMode'
import { sideLabels } from '../sideLabels'
import { useLocalStorage } from '../useLocalStorage'

const LANGUAGES = [
  { code: 'en', flag: '🇬🇧', label: 'EN', name: 'English' },
  { code: 'it', flag: '🇮🇹', label: 'IT', name: 'Italiano' },
] as const

const Title = styled('h1')`
  color: white;
  font-size: 6rem;
  font-weight: 600;
  margin: 0;
  text-align: center;
  letter-spacing: 0.05em;
  text-shadow: 0 4px 12px var(--overlay-black-40);

  @media (max-height: 600px) {
    font-size: 4rem;
  }
`

const ProgressBarContainer = styled('div')`
  width: 100%;
  height: var(--space-2);
  background-color: var(--overlay-white-25);
  border-radius: var(--space-1);
  overflow: hidden;
`

const ProgressBarFill = styled('div')<{ progress: number }>`
  height: 100%;
  width: ${(props) => props.progress * 100}%;
  background: var(--color-primary);
  border-radius: var(--space-1);
  transition: width 0.3s ease;
`

const ButtonStack = styled('div')`
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
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
  margin-top: var(--space-4);

  & > button {
    width: 100%;
  }
`

const LocalGameRow = styled('div')`
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  width: 100%;

  & > button {
    flex: 1;
  }
`

const PlayerCountSelect = styled('select')`
  border-radius: var(--space-2);
  padding: var(--space-2) var(--space-4);
  color: white;
  font-size: 1rem;
  font-weight: 600;
  background: var(--overlay-white-05);
  border: 2px solid var(--overlay-white-25);
  cursor: pointer;
  flex: 1;
  transition: border-color 0.15s, background-color 0.15s;

  &:hover {
    border-color: var(--overlay-white-50);
    background-color: var(--overlay-white-25);
  }

  &:focus {
    outline: 2px solid var(--overlay-white-50);
    outline-offset: 2px;
  }

  @media (max-height: 600px) {
    padding: var(--space-1) var(--space-2);
    font-size: 0.875rem;
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
  top: var(--space-4);
  right: var(--space-4);
  display: flex;
  align-items: center;
`

const LangButton = styled('button')`
  font-size: 1.25rem;
  height: 2.25rem;
  padding: 0 var(--space-2);
  border-radius: var(--space-2);
  border: 2px solid var(--overlay-white-25);
  background-color: var(--overlay-white-05);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: var(--space-1);
  transition: border-color 0.15s, background-color 0.15s, transform 0.1s;
  line-height: 1;

  &:hover {
    border-color: var(--overlay-white-50);
    background-color: var(--overlay-white-25);
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
  onStart: (avatar: string, playerCount: PlayerCount, difficulty: Difficulty) => void
  resume?: ResumableGame
  onStartMultiplayer?: (avatar: string) => void
}

export const TitleScreen = ({ loadingProgress, onStart, resume, onStartMultiplayer }: TitleScreenProps) => {
  const { t, i18n } = useTranslation()
  const [selectedAvatar, setSelectedAvatar] = useLocalStorage('last-avatar', AVATARS[0])
  const [difficulty, setDifficulty] = useLocalStorage<Difficulty>('last-difficulty', 'normal')
  const [playerCount, setPlayerCount] = useLocalStorage<PlayerCount>('last-player-count', 2)

  return (
    <ModalOverlay>
      <ModalPanel>
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
              <LocalGameRow>
                <PlayerCountSelect
                  aria-label={t('playerCount')}
                  value={playerCount}
                  onChange={(event) => setPlayerCount(Number(event.target.value) as PlayerCount)}
                >
                  <option value={2}>{t('twoPlayers')}</option>
                  <option value={3}>{t('threePlayers')}</option>
                  <option value={4}>{t('fourPlayersTeams')}</option>
                  <option value={6}>{t('sixPlayersTeams')}</option>
                </PlayerCountSelect>
                <Button onClick={() => onStart(selectedAvatar, playerCount, difficulty)}>
                  {t('startOfflineGame')}
                </Button>
              </LocalGameRow>
              {onStartMultiplayer && (
                <OnlineGameSection>
                  <Button onClick={() => onStartMultiplayer(selectedAvatar)}>{t('vsFriends')}</Button>
                </OnlineGameSection>
              )}
              {resume && (
                <ResumeSection>
                  <StackedButton
                    main={resume.kind === 'online' ? `${t('onlineGame')} \u00b7 ${t('resume')}` : t('resume')}
                    caption={sideLabels(resume.avatars)
                      .map((label, i) => `${label} ${resume.score[i] ?? 0}`)
                      .join(' \u00b7 ')}
                    onClick={resume.onResume}
                  />
                </ResumeSection>
              )}
            </ButtonStack>
            <LangRow>
              {LANGUAGES.filter(({ code }) => code !== i18n.language).map(({ code, flag, label, name }) => (
                <LangButton key={code} onClick={() => i18n.changeLanguage(code)} aria-label={name} lang={code}>
                  {flag} <LangButtonText>{label}</LangButtonText>
                </LangButton>
              ))}
            </LangRow>
          </>
        )}
      </ModalPanel>
    </ModalOverlay>
  )
}
