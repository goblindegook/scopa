import styled from '@emotion/styled'
import { useTranslation } from 'react-i18next'
import { DIFFICULTIES, type Difficulty } from './OfflineMode'

const Section = styled('div')`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  width: 100%;
`

const Label = styled('p')`
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.875rem;
  margin: 0;
  letter-spacing: 0.05em;
  text-transform: uppercase;
`

const Row = styled('div')`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
  width: 100%;
`

const DifficultyButton = styled('button')<{ selected: boolean }>`
  position: relative;
  font-size: 0.875rem;
  width: 100%;
  padding: 0.625rem 0.25rem;
  border: none;
  background: none;
  color: rgba(255, 255, 255, ${({ selected }) => (selected ? 1 : 0.7)});
  cursor: pointer;
  line-height: 1;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 0.5rem;
    border: 2px solid ${({ selected }) => (selected ? 'rgba(74, 222, 128, 0.9)' : 'rgba(255, 255, 255, 0.2)')};
    background-color: ${({ selected }) => (selected ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.05)')};
    transition: border-color 0.15s, background-color 0.15s;
  }

  &:hover::before {
    border-color: rgba(255, 255, 255, 0.5);
    background-color: rgba(255, 255, 255, 0.15);
  }
`

const Text = styled('span')`
  position: relative;
`

interface DifficultyPickerProps {
  readonly selected: Difficulty
  readonly onSelect: (difficulty: Difficulty) => void
}

export const DifficultyPicker = ({ selected, onSelect }: DifficultyPickerProps) => {
  const { t } = useTranslation()

  return (
    <Section>
      <Label>{t('difficulty')}</Label>
      <Row>
        {DIFFICULTIES.map((difficulty) => (
          <DifficultyButton
            key={difficulty}
            type="button"
            selected={difficulty === selected}
            aria-pressed={difficulty === selected}
            aria-label={t('selectDifficulty', { level: t(difficulty) })}
            onClick={() => onSelect(difficulty)}
          >
            <Text>{t(difficulty)}</Text>
          </DifficultyButton>
        ))}
      </Row>
    </Section>
  )
}
