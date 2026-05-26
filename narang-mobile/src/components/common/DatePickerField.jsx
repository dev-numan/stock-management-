import React, { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { TextInput, HelperText, Button, useTheme } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { formatDate } from '../../utils/formatDate';

function parseDateValue(value) {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0, 0);
  }
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return today;
}

function toIsoDate(date) {
  return format(date, 'yyyy-MM-dd');
}

export default function DatePickerField({
  label,
  value,
  onChange,
  onBlur,
  error,
  placeholder = 'Tap to select date',
  minimumDate,
  maximumDate,
  clearable = false,
  editable = true,
}) {
  const theme = useTheme();
  const [showPicker, setShowPicker] = useState(false);
  const pickerDate = parseDateValue(value);

  const closePicker = () => {
    setShowPicker(false);
    onBlur?.();
  };

  const handleChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
      if (event.type === 'dismissed') {
        onBlur?.();
        return;
      }
    }
    if (selectedDate) {
      onChange(toIsoDate(selectedDate));
    }
    if (Platform.OS === 'android') {
      onBlur?.();
    }
  };

  const openPicker = () => {
    if (!editable) return;
    setShowPicker(true);
  };

  return (
    <View style={{ marginBottom: 12 }}>
      <Pressable onPress={openPicker} disabled={!editable}>
        <View pointerEvents="none">
          <TextInput
            mode="outlined"
            label={label}
            value={value ? formatDate(value) : ''}
            placeholder={placeholder}
            editable={false}
            error={!!error}
            right={<TextInput.Icon icon="calendar-month" onPress={openPicker} />}
            outlineColor={theme.colors.outline}
            activeOutlineColor={theme.colors.primary}
            style={{
              backgroundColor: editable ? theme.colors.surface : theme.colors.surfaceVariant,
            }}
          />
        </View>
      </Pressable>

      {showPicker ? (
        <View style={{ marginTop: 4 }}>
          <DateTimePicker
            value={pickerDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={handleChange}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
          />
          {Platform.OS === 'ios' ? (
            <Button mode="contained-tonal" onPress={closePicker} style={{ marginTop: 8 }}>
              Done
            </Button>
          ) : null}
        </View>
      ) : null}

      {clearable && value && editable ? (
        <Button compact mode="text" onPress={() => onChange('')} style={{ alignSelf: 'flex-start' }}>
          Clear date
        </Button>
      ) : null}

      {error ? <HelperText type="error">{error}</HelperText> : null}
    </View>
  );
}
