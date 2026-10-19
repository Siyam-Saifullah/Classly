import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';

import { getCoursesBySemester } from '@/database/courses';
import { createClassSession, updateClassSession } from '@/database/classes';
import { createEvent, updateEvent, getEventsByCourse } from '@/database/events';
import { generateId } from '@/utils/ids';
import { getTodayString } from '@/utils/classes';
import type { Course, AcademicEvent, AcademicEventType, ClassSession } from '@/types';

const T = {
  bg: '#090a0f',
  card: '#121522',
  cardDeep: '#0d0f1a',
  border: '#20263b',
  borderInner: '#181d2f',
  text: '#ffffff',
  textSub: '#a1a1aa',
  textDim: '#71717a',
  brand: '#8b5cf6',
  brandLight: 'rgba(139,92,246,0.15)',
};

const ms = StyleSheet.create({
  label: { fontSize: 10, fontWeight: '700', color: T.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginTop: 16 },
  hint: { fontSize: 13, color: T.textSub },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, borderWidth: 1, borderColor: T.border, backgroundColor: T.borderInner },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { fontSize: 13, fontWeight: '600', color: T.text },
  input: { backgroundColor: T.borderInner, borderWidth: 1, borderColor: T.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: T.text, marginBottom: 4 },
  saveBtn: { marginTop: 24, borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
});

export interface MorphingAddCardProps {
  visible: boolean;
  type: string; // 'class', 'ct', 'assignment'
  activeSemester: any;
  onClose: () => void;
  onSaved: () => void;
  editItem?: ClassSession | AcademicEvent | null; // Pass item to edit
}

export function MorphingAddCard({ visible, type, activeSemester, onClose, onSaved, editItem }: MorphingAddCardProps) {
  const morphAnim = React.useRef(new Animated.Value(0)).current;

  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [courseEvents, setCourseEvents] = useState<AcademicEvent[]>([]);
  
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(getTodayString());
  const [dateObj, setDateObj] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [time, setTime] = useState('10:00');
  const [timeObj, setTimeObj] = useState(() => { const d = new Date(); d.setHours(10, 0, 0, 0); return d; });
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [endTime, setEndTime] = useState('11:00');
  const [endTimeObj, setEndTimeObj] = useState(() => { const d = new Date(); d.setHours(11, 0, 0, 0); return d; });
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  useEffect(() => {
    if (visible) {
      Animated.spring(morphAnim, { 
        toValue: 1, 
        useNativeDriver: false, 
        tension: 50, 
        friction: 8 
      }).start();
      
      if (activeSemester) {
        getCoursesBySemester(activeSemester.id).then((loadedCourses) => {
          setCourses(loadedCourses);
          
          if (editItem) {
            // Populate fields if editing
            const course = loadedCourses.find(c => c.id === editItem.courseId);
            if (course) setSelectedCourse(course);
            
            setDate(editItem.date);
            setDateObj(new Date(editItem.date + 'T00:00:00'));
            
            if ('startTime' in editItem) { // ClassSession
              if (editItem.teacherId) setSelectedTeacherId(editItem.teacherId);
              setTime(editItem.startTime);
              const start = new Date(editItem.date + 'T' + editItem.startTime);
              if (!isNaN(start.getTime())) setTimeObj(start);
              
              setEndTime(editItem.endTime);
              const end = new Date(editItem.date + 'T' + editItem.endTime);
              if (!isNaN(end.getTime())) setEndTimeObj(end);
            } else { // AcademicEvent
              setTitle(editItem.title);
              if (editItem.time) {
                setTime(editItem.time);
                const start = new Date(editItem.date + 'T' + editItem.time);
                if (!isNaN(start.getTime())) setTimeObj(start);
              }
            }
          }
        });
      }
    } else {
      morphAnim.setValue(0);
      if (!editItem) {
        setSelectedCourse(null); setSelectedTeacherId(null); setTitle('');
      }
    }
  }, [visible, activeSemester?.id, editItem]);

  useEffect(() => {
    if (selectedCourse) getEventsByCourse(selectedCourse.id).then(setCourseEvents);
  }, [selectedCourse?.id]);

  useEffect(() => {
    if (!editItem) {
      if (type === 'ct' && selectedCourse) setTitle('CT ' + (courseEvents.filter(e => e.type === 'ct').length + 1));
      else if (type === 'assignment' && selectedCourse) setTitle('Assignment ' + (courseEvents.filter(e => e.type === 'assignment').length + 1));
    }
  }, [type, selectedCourse, courseEvents, editItem]);

  async function handleSave() {
    if (!activeSemester) return;
    try {
      const now = new Date().toISOString();
      if (type === 'class') {
        if (!selectedCourse) { Alert.alert('Select a course'); return; }
        
        if (editItem) {
          const session = editItem as ClassSession;
          await updateClassSession({
            ...session,
            courseId: selectedCourse.id,
            date,
            startTime: time,
            endTime: endTime,
            room: selectedCourse.room ?? undefined,
            teacherId: selectedTeacherId ?? undefined,
          });
        } else {
          await createClassSession({ id: generateId('cls'), courseId: selectedCourse.id, semesterId: activeSemester.id, date, startTime: time, endTime: endTime, room: selectedCourse.room, teacherId: selectedTeacherId ?? undefined, isCancelled: false, createdAt: now });
        }
      } else {
        if (!title.trim()) { Alert.alert('Enter a title'); return; }
        let ft = title.trim();
        // Append teacher to title if creating fresh, maybe not on edit if it's already there
        if (!editItem && selectedTeacherId && selectedCourse?.teachers) {
          const tn = selectedCourse.teachers.find(t => t.id === selectedTeacherId)?.name;
          if (tn) ft = ft + ' (' + tn + ')';
        }
        
        if (editItem) {
          const evt = editItem as AcademicEvent;
          await updateEvent({
            ...evt,
            courseId: selectedCourse?.id ?? undefined,
            type: type as AcademicEventType,
            title: ft,
            date,
            time: type !== 'assignment' ? time : undefined,
            updatedAt: now,
          });
        } else {
          await createEvent({ id: generateId('evt'), semesterId: activeSemester.id, courseId: selectedCourse?.id, type: type as AcademicEventType, title: ft, date, time: type !== 'assignment' ? time : undefined, isCompleted: false, createdAt: now, updatedAt: now });
        }
      }
      onSaved(); onClose();
    } catch (err) { Alert.alert('Error', 'Failed to save'); }
  }

  if (!visible) return null;

  // Approximate starting top position to match the inline dropdown menu items
  const startTop = type === 'assignment' ? 350 : type === 'ct' ? 408 : 466;

  const cardWidth = morphAnim.interpolate({ inputRange: [0, 1], outputRange: [160, 340] });
  const cardHeight = morphAnim.interpolate({ inputRange: [0, 1], outputRange: [48, 620] });
  const cardTop = morphAnim.interpolate({ inputRange: [0, 1], outputRange: [startTop, Platform.OS === 'ios' ? 80 : 40] });
  const cardRight = morphAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 20] });
  const cardOpacity = morphAnim.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0, 1, 1] });
  
  const contentOpacity = morphAnim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0, 1] });

  const onDChange = (_: any, s?: Date) => { if (Platform.OS === 'android') setShowDatePicker(false); if (s) { setDateObj(s); setDate(format(s, 'yyyy-MM-dd')); } };
  const onDDismiss = () => { if (Platform.OS === 'android') setShowDatePicker(false); };
  const onTChange = (_: any, s?: Date) => { 
    if (Platform.OS === 'android') setShowTimePicker(false); 
    if (s) { 
      setTimeObj(s); setTime(format(s, 'HH:mm')); 
      const endD = new Date(s.getTime() + 60 * 60 * 1000);
      setEndTimeObj(endD); setEndTime(format(endD, 'HH:mm'));
    } 
  };
  const onTDismiss = () => { if (Platform.OS === 'android') setShowTimePicker(false); };
  const onETChange = (_: any, s?: Date) => { if (Platform.OS === 'android') setShowEndTimePicker(false); if (s) { setEndTimeObj(s); setEndTime(format(s, 'HH:mm')); } };
  const onETDismiss = () => { if (Platform.OS === 'android') setShowEndTimePicker(false); };

  const typeColor = type === 'class' ? '#6366f1' : type === 'ct' ? '#ec4899' : '#f59e0b';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <TouchableOpacity style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]} onPress={onClose} />
      <Animated.View style={{
        position: 'absolute', top: cardTop, right: cardRight,
        width: cardWidth, height: cardHeight, opacity: cardOpacity,
        backgroundColor: T.card, borderRadius: 24,
        borderWidth: 1, borderColor: T.border, overflow: 'hidden',
        shadowColor: typeColor, shadowOpacity: 0.3, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 12,
      }}>
        <Animated.View style={{ flex: 1, opacity: contentOpacity }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderColor: T.border }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: typeColor, textTransform: 'capitalize' }}>
              {editItem ? 'Edit' : 'New'} {type === 'ct' ? 'Class Test' : type}
            </Text>
            <TouchableOpacity onPress={onClose}><Text style={{ color: T.textSub, fontSize: 18 }}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1, padding: 20 }} keyboardShouldPersistTaps="handled">
          <Text style={ms.label}>COURSE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {courses.map(c => (
                <TouchableOpacity key={c.id} style={[ms.chip, selectedCourse?.id === c.id && { borderColor: c.color, backgroundColor: c.color + '20' }]} onPress={() => { setSelectedCourse(c); setSelectedTeacherId(c.teachers?.[0]?.id ?? c.teacherId ?? null); }}>
                  <View style={[ms.chipDot, { backgroundColor: c.color }]} />
                  <Text style={ms.chipText}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {(selectedCourse?.teachers?.length ?? 0) > 1 && (
            <>
              <Text style={ms.label}>TEACHER</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {selectedCourse!.teachers!.map(t => (
                    <TouchableOpacity key={t.id} style={[ms.chip, selectedTeacherId === t.id && { borderColor: T.brand, backgroundColor: T.brandLight }]} onPress={() => setSelectedTeacherId(t.id)}>
                      <Text style={ms.chipText}>👤 {t.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </>
          )}

          {type !== 'class' && (
            <>
              <Text style={ms.label}>TITLE</Text>
              <TextInput style={ms.input} value={title} onChangeText={setTitle} placeholderTextColor={T.textDim} placeholder="Title" />
            </>
          )}

          <Text style={ms.label}>DATE</Text>
          {Platform.OS === 'ios' ? <DateTimePicker value={dateObj} mode="date" display="spinner" onValueChange={onDChange} onDismiss={onDDismiss} textColor={T.text} /> : (
            <TouchableOpacity style={ms.input} onPress={() => setShowDatePicker(true)}><Text style={{ color: T.text }}>{date}</Text></TouchableOpacity>
          )}
          {Platform.OS === 'android' && showDatePicker && <DateTimePicker value={dateObj} mode="date" onValueChange={onDChange} onDismiss={onDDismiss} />}

          {type !== 'assignment' && (
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={ms.label}>START TIME</Text>
                {Platform.OS === 'ios' ? <DateTimePicker value={timeObj} mode="time" display="spinner" onValueChange={onTChange} onDismiss={onTDismiss} textColor={T.text} /> : (
                  <TouchableOpacity style={ms.input} onPress={() => setShowTimePicker(true)}><Text style={{ color: T.text }}>{time}</Text></TouchableOpacity>
                )}
                {Platform.OS === 'android' && showTimePicker && <DateTimePicker value={timeObj} mode="time" onValueChange={onTChange} onDismiss={onTDismiss} />}
              </View>
              
              {type === 'class' && (
                <View style={{ flex: 1 }}>
                  <Text style={ms.label}>END TIME</Text>
                  {Platform.OS === 'ios' ? <DateTimePicker value={endTimeObj} mode="time" display="spinner" onValueChange={onETChange} onDismiss={onETDismiss} textColor={T.text} /> : (
                    <TouchableOpacity style={ms.input} onPress={() => setShowEndTimePicker(true)}><Text style={{ color: T.text }}>{endTime}</Text></TouchableOpacity>
                  )}
                  {Platform.OS === 'android' && showEndTimePicker && <DateTimePicker value={endTimeObj} mode="time" onValueChange={onETChange} onDismiss={onETDismiss} />}
                </View>
              )}
            </View>
          )}

            <TouchableOpacity style={[ms.saveBtn, { backgroundColor: typeColor }]} onPress={handleSave}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>{editItem ? 'Save Changes' : 'Save'}</Text>
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </View>
  );
}
