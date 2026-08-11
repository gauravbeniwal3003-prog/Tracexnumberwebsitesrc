import re

with open('src/components/DashboardServicesView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Update handleSelectCategory
old_handle = '''  const handleSelectCategory = (cat: Category) => {
    navigate(`/category/${cat.id}`);
  };'''

new_handle = '''  const handleSelectCategory = (cat: Category) => {
    if (cat.subservices.length === 1) {
      navigate(`/service/${cat.subservices[0].id}`);
    } else {
      navigate(`/category/${cat.id}`);
    }
  };'''

content = content.replace(old_handle, new_handle)

# Add useEffect for auto-redirect when visiting category URL directly
use_effect_str = '''
  // Auto-redirect if category has only 1 subservice and we are on the category view
  useEffect(() => {
    if (selectedCategory && !selectedSubService && selectedCategory.subservices.length === 1) {
      navigate(`/service/${selectedCategory.subservices[0].id}`, { replace: true });
    }
  }, [selectedCategory, selectedSubService, navigate]);
'''

# Find the end of handleBackToCategories
search_str = '''  const handleBackToCategories = () => {
    navigate('/dashboard');
  };'''

content = content.replace(search_str, search_str + '\n' + use_effect_str)

with open('src/components/DashboardServicesView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

