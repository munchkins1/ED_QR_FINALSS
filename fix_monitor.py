p = r'c:\Users\Admin\Downloads\ed_finals_QR-main (1)\ed_finals_QR-main\app\campus\(tabs)\monitor-attendance.tsx'
with open(p, 'r', encoding='utf-8') as f:
    content = f.read()

# ===== CHANGE 1A: Remove redundant selectorCard block =====
old_selector = '''              <View style={styles.selectorCard}>
                <Text style={styles.selectorTitle} numberOfLines={1}>
                  {events.find((e) => e.id === selectedId)?.name ?? 'Select event'}
                </Text>
                {(() => {
                  const s = events.find((e) => e.id === selectedId)?.status;
                  const open = s === 'open';
                  return (
                    <View style={[styles.badge, open ? styles.badgeOpen : styles.badgeClosed]}}>
                      <Text style={[styles.badgeText, open ? styles.badgeOpenText : styles.badgeClosedText]}>{s ?? ''}</Text>
                    </View>
                  );
                })()}
              </View>'''

new_selector = ''

if old_selector in content:
    content = content.replace(old_selector, new_selector)
    print("selectorCard removed.")
else:
    print("WARNING: selectorCard pattern not found!")

# ===== CHANGE 1B: Move Live Check-ins stats to top =====
# We need to move the liveCard block to right after the segment tabs (before Dropdown)
old_block = '''            <Dropdown
                label="Event"
                value={selectedId}
                options={events.map((event) => ({ label: `${event.name} (${event.status})`, value: event.id }))}
                onChange={setSelectedId}
              />
              <AttendanceRecords
                records={records}
                loading={false}
                canEdit={!isAdmin}
                readOnly={isAdmin}
                compactFilters
                onChanged={loadRecords}
              />
              <View style={styles.liveCard}>
                <Text style={styles.liveTitle}>
                  Live Check-ins: {records.length}
                </Text>
                <View style={styles.liveRow}>
                  <View style={styles.liveCell}>
                    <Text style={[styles.liveNum, { color: COLORS.success }]}>
                      {records.filter((r) => r.status === 'present').length}
                    </Text>
                    <Text style={styles.liveLabel}>Present</Text>
                  </View>
                  <View style={styles.liveCell}>
                    <Text style={[styles.liveNum, { color: '#EA580C' }]}>
                      {records.filter((r) => r.status === 'late').length}
                    </Text>
                    <Text style={styles.liveLabel}>Late</Text>
                  </View>
                  <View style={styles.liveCell}>
                    <Text style={[styles.liveNum, { color: COLORS.danger }]}>
                      {records.filter((r) => r.status === 'absent').length}
                    </Text>
                    <Text style={styles.liveLabel}>Absent</Text>
                  </View>
                  <View style={styles.liveCell}>
                    <Text style={[styles.liveNum, { color: COLORS.primary }]}>
                      {records.filter((r) => r.status === 'excused').length}
                    </Text>
                    <Text style={styles.liveLabel}>Excused</Text>
                  </View>
                </View>
              </View>
            </>'''

new_block = '''            <View style={styles.liveCard}>
                <Text style={styles.liveTitle}>
                  Live Check-ins: {records.length}
                </Text>
                <View style={styles.liveRow}>
                  <View style={styles.liveCell}>
                    <Text style={[styles.liveNum, { color: COLORS.success }]}>
                      {records.filter((r) => r.status === 'present').length}
                    </Text>
                    <Text style={styles.liveLabel}>Present</Text>
                  </View>
                  <View style={styles.liveCell}>
                    <Text style={[styles.liveNum, { color: '#EA580C' }]}>
                      {records.filter((r) => r.status === 'late').length}
                    </Text>
                    <Text style={styles.liveLabel}>Late</Text>
                  </View>
                  <View style={styles.liveCell}>
                    <Text style={[styles.liveNum, { color: COLORS.danger }]}>
                      {records.filter((r) => r.status === 'absent').length}
                    </Text>
                    <Text style={styles.liveLabel}>Absent</Text>
                  </View>
                  <View style={styles.liveCell}>
                    <Text style={[styles.liveNum, { color: COLORS.primary }]}>
                      {records.filter((r) => r.status === 'excused').length}
                    </Text>
                    <Text style={styles.liveLabel}>Excused</Text>
                  </View>
                </View>
              </View>
              <Dropdown
                label="Event"
                value={selectedId}
                options={events.map((event) => ({ label: `${event.name} (${event.status})`, value: event.id }))}
                onChange={setSelectedId}
              />
              <AttendanceRecords
                records={records}
                loading={false}
                canEdit={!isAdmin}
                readOnly={isAdmin}
                compactFilters
                onChanged={loadRecords}
              />
            </>'''

if old_block in content:
    content = content.replace(old_block, new_block)
    print("liveCard moved to top.")
else:
    print("WARNING: liveCard block pattern not found!")

with open(p, 'w', encoding='utf-8') as f:
    f.write(content)
print("monitor-attendance.tsx changes saved.")
