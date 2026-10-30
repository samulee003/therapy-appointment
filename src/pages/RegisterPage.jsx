import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Container,
  Grid,
  Link,
  InputAdornment,
  IconButton,
  Divider,
  Stepper,
  Step,
  StepLabel,
  useTheme,
  useMediaQuery,
  Alert,
  CircularProgress,
  FormHelperText,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PhoneIcon from '@mui/icons-material/Phone';
import { registerUser, formatApiError } from '../services/api';
import { ErrorAlert } from '../components/common';

const RegisterPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [activeStep, setActiveStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  // 表單驗證錯誤
  const [errors, setErrors] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // 表單驗證正則表達式
  const PATTERNS = {
    EMAIL: /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    PHONE: /^[0-9+()-\s]{8,}$/, // 更加靈活的電話格式，允許國際格式
    PASSWORD_STRONG: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/,
    PASSWORD_MEDIUM: /^(?=.*[a-zA-Z])(?=.*\d)[A-Za-z\d]{6,}$/,
    NAME: /^[\u4e00-\u9fa5a-zA-Z\s]{2,30}$/, // 中文或英文名，2-30個字符
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleToggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const validateField = (name, value) => {
    let errorMessage = '';

    switch (name) {
      case 'name':
        if (!value.trim()) {
          errorMessage = '請輸入您的姓名';
        } else if (!PATTERNS.NAME.test(value)) {
          errorMessage = '姓名應為 2-30 個漢字或英文字母';
        }
        break;

      case 'email':
        if (!value.trim()) {
          errorMessage = '請輸入您的電子郵件';
        } else if (!PATTERNS.EMAIL.test(value)) {
          errorMessage = '請輸入有效的電子郵件格式 (例如: user@example.com)';
        }
        break;

      case 'phone':
        if (!value.trim()) {
          errorMessage = '請輸入您的電話號碼';
        } else if (!PATTERNS.PHONE.test(value)) {
          errorMessage = '請輸入有效的電話號碼（至少 8 位數字，可包含 +()-）';
        }
        break;

      case 'password':
        if (!value) {
          errorMessage = '請輸入密碼';
        } else if (value.length < 6) {
          errorMessage = '密碼長度至少為 6 位';
        } else if (!PATTERNS.PASSWORD_MEDIUM.test(value)) {
          errorMessage = '密碼需包含至少一個字母和一個數字';
        }
        break;

      case 'confirmPassword':
        if (!value) {
          errorMessage = '請確認您的密碼';
        } else if (value !== formData.password) {
          errorMessage = '兩次密碼輸入不一致';
        }
        break;

      default:
        break;
    }

    return errorMessage;
  };

  const handleChange = e => {
    const { name, value } = e.target;

    // 更新表單數據
    setFormData({
      ...formData,
      [name]: value,
    });

    // 更新錯誤訊息
    setErrors({
      ...errors,
      [name]: validateField(name, value),
    });

    // 在確認密碼欄位變化時，重新驗證確認密碼
    if (name === 'password') {
      setErrors(prev => ({
        ...prev,
        confirmPassword: formData.confirmPassword
          ? value === formData.confirmPassword
            ? ''
            : '兩次密碼輸入不一致'
          : prev.confirmPassword,
      }));
    }
  };

  const validateCurrentStep = () => {
    if (activeStep === 0) {
      // 基本信息
      const stepErrors = {};

      // 驗證姓名
      stepErrors.name = validateField('name', formData.name);

      // 驗證電子郵件
      stepErrors.email = validateField('email', formData.email);

      // 驗證電話號碼
      stepErrors.phone = validateField('phone', formData.phone);

      setErrors({ ...errors, ...stepErrors });

      return !stepErrors.name && !stepErrors.email && !stepErrors.phone;
    } else if (activeStep === 1) {
      // 帳號設置
      const stepErrors = {};

      // 驗證密碼
      stepErrors.password = validateField('password', formData.password);

      // 驗證確認密碼
      stepErrors.confirmPassword = validateField('confirmPassword', formData.confirmPassword);

      setErrors({ ...errors, ...stepErrors });

      return !stepErrors.password && !stepErrors.confirmPassword;
    }

    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setActiveStep(prevActiveStep => prevActiveStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep(prevActiveStep => prevActiveStep - 1);
  };

  const handleSubmit = async event => {
    event.preventDefault();
    setError('');

    // 最後確認所有表單都驗證通過
    const nameError = validateField('name', formData.name);
    const emailError = validateField('email', formData.email);
    const phoneError = validateField('phone', formData.phone);
    const passwordError = validateField('password', formData.password);
    const confirmPasswordError = validateField('confirmPassword', formData.confirmPassword);

    setErrors({
      name: nameError,
      email: emailError,
      phone: phoneError,
      password: passwordError,
      confirmPassword: confirmPasswordError,
    });

    // 如果有任何錯誤，阻止表單提交
    if (nameError || emailError || phoneError || passwordError || confirmPasswordError) {
      return;
    }

    setLoading(true);

    const registrationData = {
      username: formData.email,
      password: formData.password,
      name: formData.name,
      phone: formData.phone,
    };

    try {
      const response = await registerUser(registrationData);
      navigate('/login', { state: { message: '註冊成功！請使用您的帳號登入。' } });
    } catch (err) {
      console.error('Registration failed:', err);
      // 使用格式化的錯誤訊息
      const formattedError = err.formatted || formatApiError(err, '註冊失敗，請稍後再試');
      setError(formattedError.message);

      // 如果伺服器返回的是電子郵件已存在的錯誤，設置對應欄位的錯誤
      if (formattedError.code === 409) {
        setErrors(prev => ({
          ...prev,
          email: '此電子郵件已被註冊',
        }));
      }
    } finally {
      setLoading(false);
    }
  };

  const steps = ['基本信息', '帳號設置', '完成註冊'];

  const getStepContent = step => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                id="name"
                label="姓名 (Name)"
                name="name"
                value={formData.name}
                onChange={handleChange}
                error={!!errors.name}
                helperText={errors.name}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonOutlineIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                id="email"
                label="電子郵件 (Email)"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                error={!!errors.email}
                helperText={errors.email}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailOutlinedIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                id="phone"
                label="電話號碼 (Phone Number)"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                error={!!errors.phone}
                helperText={errors.phone}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PhoneIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2">公開註冊為患者帳號；治療師帳號請聯絡管理員。</Typography>
            </Grid>
          </Grid>
        );
      case 1:
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                name="password"
                label="密碼 (Password)"
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={formData.password}
                onChange={handleChange}
                error={!!errors.password}
                helperText={errors.password}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlinedIcon color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={handleTogglePasswordVisibility}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                name="confirmPassword"
                label="確認密碼 (Confirm Password)"
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlinedIcon color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle confirm password visibility"
                        onClick={handleToggleConfirmPasswordVisibility}
                        edge="end"
                      >
                        {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormHelperText>
                密碼安全規則:
                <ul>
                  <li>至少 6 個字符</li>
                  <li>必須包含至少一個字母和一個數字</li>
                </ul>
              </FormHelperText>
            </Grid>
          </Grid>
        );
      case 2:
        return (
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              註冊資訊確認
            </Typography>
            <Grid container spacing={2} sx={{ mt: 2 }}>
              <Grid item xs={6} sx={{ textAlign: 'right', fontWeight: 'bold' }}>
                <Typography>姓名:</Typography>
              </Grid>
              <Grid item xs={6} sx={{ textAlign: 'left' }}>
                <Typography>{formData.name}</Typography>
              </Grid>
              <Grid item xs={6} sx={{ textAlign: 'right', fontWeight: 'bold' }}>
                <Typography>電子郵件:</Typography>
              </Grid>
              <Grid item xs={6} sx={{ textAlign: 'left' }}>
                <Typography>{formData.email}</Typography>
              </Grid>
              <Grid item xs={6} sx={{ textAlign: 'right', fontWeight: 'bold' }}>
                <Typography>電話號碼:</Typography>
              </Grid>
              <Grid item xs={6} sx={{ textAlign: 'left' }}>
                <Typography>{formData.phone}</Typography>
              </Grid>
              <Grid item xs={6} sx={{ textAlign: 'right', fontWeight: 'bold' }}>
                <Typography>身份:</Typography>
              </Grid>
              <Grid item xs={6} sx={{ textAlign: 'left' }}>
                <Typography>患者</Typography>
              </Grid>
            </Grid>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
              請確認以上資訊無誤。點擊「完成註冊」按鈕後，您的帳號將被創建。
            </Typography>
          </Box>
        );
      default:
        return 'Unknown step';
    }
  };

  return (
    <Container component="main" maxWidth="sm" sx={{ mb: 4 }}>
      <Paper
        elevation={3}
        sx={{
          p: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          borderRadius: 2,
          mt: isMobile ? 2 : 8,
        }}
      >
        <Typography component="h1" variant="h4" color="primary" fontWeight="bold" gutterBottom>
          註冊帳號
        </Typography>
        <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 3 }}>
          創建您的帳號以使用心理治療預約系統
        </Typography>

        <Stepper activeStep={activeStep} alternativeLabel sx={{ width: '100%', mb: 4 }}>
          {steps.map(label => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <ErrorAlert message={error} onClose={() => setError('')} sx={{ width: '100%', mb: 3 }} />
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
          {getStepContent(activeStep)}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
              variant="outlined"
              sx={{ mr: 1 }}
            >
              上一步
            </Button>
            <Box>
              {activeStep === steps.length - 1 ? (
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  size="large"
                  sx={{ py: 1, px: 4 }}
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : '完成註冊'}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleNext}
                  size="large"
                  sx={{ py: 1, px: 4 }}
                >
                  下一步
                </Button>
              )}
            </Box>
          </Box>
        </Box>

        <Box sx={{ width: '100%', mt: 4 }}>
          <Divider sx={{ mb: 2 }} />

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              已有帳號？{' '}
              <Link
                component={RouterLink}
                to="/login"
                variant="body2"
                color="primary"
                fontWeight="medium"
              >
                立即登入
              </Link>
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default RegisterPage;
