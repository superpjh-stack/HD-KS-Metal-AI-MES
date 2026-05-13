'use client';
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLogin } from '@/hooks/useAuth';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { mutate: login, isPending } = useLogin();

  const handleLogin = () => {
    if (!email || !password) { Alert.alert('입력 오류', '이메일과 비밀번호를 입력하세요.'); return; }
    login({ email, password }, {
      onError: () => Alert.alert('로그인 실패', '이메일 또는 비밀번호를 확인하세요.'),
    });
  };

  return (
    <View className="flex-1 bg-white justify-center px-8">
      <Text className="text-2xl font-bold text-blue-800 mb-2">KS-MES</Text>
      <Text className="text-gray-500 mb-8">광성정밀 작업자 앱</Text>
      <TextInput
        className="border border-gray-300 rounded-lg px-4 py-3 mb-4 text-gray-800"
        placeholder="이메일"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        className="border border-gray-300 rounded-lg px-4 py-3 mb-6 text-gray-800"
        placeholder="비밀번호"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TouchableOpacity
        onPress={handleLogin}
        disabled={isPending}
        className="bg-blue-700 rounded-lg py-4 items-center"
      >
        {isPending
          ? <ActivityIndicator color="#fff" />
          : <Text className="text-white font-semibold text-base">로그인</Text>
        }
      </TouchableOpacity>
    </View>
  );
}
