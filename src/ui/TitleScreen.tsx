import styled from '@emotion/styled'
import { Button } from './Button'

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

interface TitleScreenProps {
  loadingProgress: number
  onStart: () => void
}

export const TitleScreen = ({ loadingProgress, onStart }: TitleScreenProps) => (
  <TitleScreenContainer>
    <TitleScreenContent>
      <Title>Scopa</Title>
      {loadingProgress < 1 ? (
        <ProgressBarContainer>
          <ProgressBarFill progress={loadingProgress} />
        </ProgressBarContainer>
      ) : (
        <Button onClick={onStart}>New Game</Button>
      )}
    </TitleScreenContent>
  </TitleScreenContainer>
)
