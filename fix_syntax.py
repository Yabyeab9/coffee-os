with open('/workspace/app-cvq4redfdog1/src/pages/site/HomePage.tsx', 'r') as f:
    content = f.read()

# Fix stray }
content = content.replace("      </section>\n\n}\n\n\n\n\n\n      {/* FEATURED MENU */}", "      </section>\n\n      {/* FEATURED MENU */}")

# Fix Button 246
old_btn_246 = '<Button onClick={() => window.location.href = \'/reservations\'} variant="outline" className="gap-2 bg-transparent text-white border-white/20 hover:bg-white/10">'
new_btn_246 = '<Button onClick={() => window.location.href = \'/reservation\'} variant="ghost" className="gap-2 border border-white/60 text-white hover:bg-white/10">'
content = content.replace(old_btn_246, new_btn_246)

# Fix Button 272
old_btn_272 = '<Button className="w-full bg-primary hover:bg-primary/90 text-white shadow-[0_0_30px_rgba(var(--primary),0.4)]">Claim Surprise Delight</Button>'
new_btn_272 = '<Button onClick={() => window.location.href = \'/menu\'} className="w-full bg-primary hover:bg-primary/90 text-white shadow-[0_0_30px_rgba(var(--primary),0.4)]">Claim Surprise Delight</Button>'
content = content.replace(old_btn_272, new_btn_272)

with open('/workspace/app-cvq4redfdog1/src/pages/site/HomePage.tsx', 'w') as f:
    f.write(content)

