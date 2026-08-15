import os

app_path = '/workspace/app-cvq4redfdog1/src/App.tsx'
with open(app_path, 'r') as f:
    app_code = f.read()
    
# Replace TestimonialsAdminPage with HomepageCmsPage
app_code = app_code.replace("import TestimonialsAdminPage from '@/pages/dashboard/TestimonialsAdminPage';", "import HomepageCmsPage from '@/pages/dashboard/HomepageCmsPage';")
app_code = app_code.replace('<Route path="testimonials" element={<TestimonialsAdminPage />} />', '<Route path="homepage-cms" element={<HomepageCmsPage />} />')

with open(app_path, 'w') as f:
    f.write(app_code)


layout_path = '/workspace/app-cvq4redfdog1/src/components/layouts/DashboardLayout.tsx'
with open(layout_path, 'r') as f:
    layout_code = f.read()

# Make sure LayoutIcon or Home is available
layout_code = layout_code.replace("import { Home, Coffee, Users", "import { Home, Coffee, Users, LayoutTemplate")
layout_code = layout_code.replace("{ name: 'Testimonials', href: '/dashboard/testimonials', icon: MessageSquare },", "{ name: 'Homepage CMS', href: '/dashboard/homepage-cms', icon: LayoutTemplate },")

with open(layout_path, 'w') as f:
    f.write(layout_code)

print("Updated App and Layout")
