import styled from '@emotion/styled'
import { useTranslation } from 'react-i18next'
import { DIFFICULTIES, type Difficulty } from '../OfflineMode'

const Section = styled('div')`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  width: 100%;
`

const Label = styled('p')`
  color: var(--overlay-white-75);
  font-size: 0.875rem;
  margin: 0;
  letter-spacing: 0.05em;
  text-transform: uppercase;
`

const Row = styled('div')`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-2);
  width: 100%;
`

const DifficultyButton = styled('button')<{ selected: boolean }>`
  position: relative;
  font-size: 0.875rem;
  width: 100%;
  padding: var(--space-2) var(--space-1);
  border: none;
  background: none;
  color: ${({ selected }) => (selected ? 'white' : 'var(--overlay-white-75)')};
  cursor: pointer;
  line-height: 1;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: var(--space-2);
    border: 2px solid ${({ selected }) => (selected ? 'var(--color-accent-translucent)' : 'var(--overlay-white-25)')};
    background-color: ${({ selected }) => (selected ? 'var(--overlay-white-25)' : 'var(--overlay-white-05)')};
    transition: border-color 0.15s, background-color 0.15s;
  }

  &:hover::before {
    border-color: var(--overlay-white-50);
    background-color: var(--overlay-white-25);
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
