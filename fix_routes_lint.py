with open('/workspace/app-cvq4redfdog1/src/routes.tsx', 'r') as f:
    routes = f.read()

routes = routes.replace("import TestimonialsAdminPage from './pages/dashboard/TestimonialsAdminPage';", "import HomepageCmsPage from './pages/dashboard/HomepageCmsPage';")
routes = routes.replace("import AiStudioPage from './pages/dashboard/AiStudioPage';", "")

routes = routes.replace("{ path: 'testimonials', component: TestimonialsAdminPage },", "{ path: 'homepage-cms', component: HomepageCmsPage },")
routes = routes.replace("{ path: 'ai-studio', component: AiStudioPage },", "")

with open('/workspace/app-cvq4redfdog1/src/routes.tsx', 'w') as f:
    f.write(routes)


with open('/workspace/app-cvq4redfdog1/src/pages/dashboard/AiManagerPage.tsx', 'r') as f:
    ai_man = f.read()

ai_man = ai_man.replace('<Button size="sm" variant="secondary" className="w-full">Send Recovery Offer</Button>', '<Button size="sm" variant="secondary" className="w-full" onClick={() => toast.success("Offer sent!")}>Send Recovery Offer</Button>')
ai_man = ai_man.replace('<Button size="sm" className="w-full">Upgrade to VIP Status</Button>', '<Button size="sm" className="w-full" onClick={() => toast.success("Customer upgraded to VIP!")}>Upgrade to VIP Status</Button>')

with open('/workspace/app-cvq4redfdog1/src/pages/dashboard/AiManagerPage.tsx', 'w') as f:
    f.write(ai_man)


with open('/workspace/app-cvq4redfdog1/src/pages/dashboard/HomepageCmsPage.tsx', 'r') as f:
    cms = f.read()

cms = cms.replace('<Button className="gap-2">', '<Button className="gap-2" onClick={() => toast.success("Not implemented yet")}>')
cms = cms.replace('<Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10">', '<Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => toast.success("Section deleted")}>')

with open('/workspace/app-cvq4redfdog1/src/pages/dashboard/HomepageCmsPage.tsx', 'w') as f:
    f.write(cms)
