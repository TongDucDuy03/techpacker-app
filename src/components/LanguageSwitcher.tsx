import { Segmented } from 'antd';
import { LanguageCode, useI18n } from '../lib/i18n';

const LanguageSwitcher = () => {
  const { lang, setLang, t } = useI18n();

  return (
    <Segmented
      aria-label={t('common.language')}
      size="small"
      value={lang}
      onChange={value => setLang(value as LanguageCode)}
      options={[
        { label: t('common.language.english'), value: 'en' },
        { label: t('common.language.vietnamese'), value: 'vi' },
      ]}
    />
  );
};

export default LanguageSwitcher;

