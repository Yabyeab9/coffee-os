with open('/workspace/app-cvq4redfdog1/src/App.tsx', 'r') as f:
    code = f.read()

code = code.replace("import AiStudioPage from '@/pages/dashboard/AiStudioPage';", "")
code = code.replace('<Route path="ai-studio" element={<AiStudioPage />} />', '')

with open('/workspace/app-cvq4redfdog1/src/App.tsx', 'w') as f:
    f.write(code)

with open('/workspace/app-cvq4redfdog1/src/components/layouts/DashboardLayout.tsx', 'r') as f:
    layout = f.read()

# AiStudio might be in the layout
layout = layout.replace("{ name: 'AI Generator', href: '/dashboard/ai-studio', icon: Sparkles },", "")

with open('/workspace/app-cvq4redfdog1/src/components/layouts/DashboardLayout.tsx', 'w') as f:
    f.write(layout)
