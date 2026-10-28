import re

p = r'c:\Users\Admin\Downloads\ed_finals_QR-main (1)\ed_finals_QR-main\components\AttendanceRecords.tsx'
with open(p, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the student card section and replace with horizontal flex layout
# The card starts with '<View key={row.id} style={styles.card}>'
# and ends before '{overrideMode ?'

# Find the pattern
start_marker = '<View key={row.id} style={styles.card}>'
end_marker = '</View>\n        ))\n      )'

# Find positions
start_pos = content.find(start_marker)
if start_pos >= 0:
    # Find the end marker after the card content
    # The card content includes cardHeader, name, meta fields, and conditional rendering
    end_pos = content.find(end_marker, start_pos)
    if end_pos >= 0:
        # Extract the old card content
        old_card = content[start_pos:end_pos + len(end_marker)]
        
        # Build the new card with horizontal flex layout
        new_card = '''<View key={row.id} style={styles.card}>
            <View style={{flex: 1}}>
              <Text style={styles.name}>{row.student?.full_name ?? 'Unknown student'}</Text>
              <Text style={styles.meta}>{row.student?.student_no}</Text>
              <Text style={styles.meta}>{row.student?.email}</Text>
              <Text style={styles.meta}>{formatDateTime(row.recorded_at)}</Text>
            </View>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 8}}>
              <View style={[styles.statusBadge, { backgroundColor: statusTone(row.status).bg, borderColor: statusTone(row.status).border }]}>
                <Text style={[styles.statusText, { color: statusColor(row.status) }]}>{row.status}</Text>
              </View>
              {editable ? (
                <AnimatedPressable
                  style={styles.deleteButton}
                  onPress={() => handleDelete(row)}
                  disabled={busyId === row.id}
                  accessibilityRole="button"
                  accessibilityLabel="Delete record"
                  glowColor={COLORS.danger}
                >
                  <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
                </AnimatedPressable>
              ) : null}
            </View>
            {overrideMode ? (
              <View style={styles.overrideBox}>
                <Text style={styles.overrideLabel}>Override Status</Text>
                <View style={styles.overrideRow}>
                  {(['present', 'absent', 'late', 'excused'] as AttendanceStatus[]).map((s) => {
                    const selected = (pendingStatus[row.id] ?? row.status) === s;
                    return (
                      <AnimatedPressable
                        key={s}
                        style={[styles.overrideBtn, selected && { borderColor: statusColor(s), backgroundColor: `${statusColor(s)}22` }]}
                        onPress={() => setPendingStatus((p) => ({ ...p, [row.id]: s }))}
                        glowColor={statusColor(s)}
                        accessibilityRole="button"
                        accessibilityLabel={s}
                      >
                        <Text style={[styles.overrideText, { color: statusColor(s) }]}>{s === 'present' ? 'Present' : s === 'absent' ? 'Absent' : s === 'late' ? 'Late' : 'Excused'}</Text>
                      </AnimatedPressable>
                    );
                  })}
                </View>
                <FieldWithIcon
                  icon="create-outline"
                  containerStyle={styles.reasonInput}
                  iconColor={COLORS.textMuted}
                  value={reasons[row.id] ?? ''}
                  onChangeText={(v) => setReasons((p) => ({ ...p, [row.id]: v }))}
                  placeholder="Reason for Correction (optional)"
                  placeholderTextColor={COLORS.textPlaceholder}
                />
                <AnimatedPressable
                  style={styles.saveBtn}
                  onPress={() => handleStatusChange(row.id, pendingStatus[row.id] ?? row.status)}
                  disabled={busyId === row.id}
                  glowColor={COLORS.primary}
                  accessibilityRole="button"
                  accessibilityLabel="Save override"
                >
                  <Text style={styles.saveText}>{busyId === row.id ? 'Saving...' : 'Save Override'}</Text>
                </AnimatedPressable>
              </View>
            ) : null}
          </View>'''
        
        if old_card in content:
            new_content = content.replace(old_card, new_card)
            with open(p, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print('Student card restructured to horizontal flexbox.')
        else:
            print('WARNING: old_card pattern not found in content!')
            # Debug: print what we're looking for
            print(f'Looking for pattern starting at: {start_pos}')
    else:
        print('WARNING: end_marker not found!')
else:
    print('WARNING: start_marker not found!')