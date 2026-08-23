import styled from '@emotion/styled'

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

const OptionButton = styled('button')<{ selected: boolean }>`
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

interface Option<T extends string | number> {
  readonly value: T
  readonly label: string
  readonly ariaLabel: string
}

interface OptionPickerProps<T extends string | number> {
  readonly label: string
  readonly options: readonly Option<T>[]
  readonly selected: T
  readonly onSelect: (value: T) => void
}

export const OptionPicker = <T extends string | number>({
  label,
  options,
  selected,
  onSelect,
}: OptionPickerProps<T>) => (
  <Section>
    <Label>{label}</Label>
    <Row>
      {options.map((option) => (
        <OptionButton
          key={option.value}
          type="button"
          selected={option.value === selected}
          aria-pressed={option.value === selected}
          aria-label={option.ariaLabel}
          onClick={() => onSelect(option.value)}
        >
          <Text>{option.label}</Text>
        </OptionButton>
      ))}
    </Row>
  </Section>
)
