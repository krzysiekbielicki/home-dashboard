import React from 'react'
import { Card, CardActionArea, CardContent, Avatar, Typography, Box } from '@mui/material'

export default function DeviceCard({ name, icon, onClick }: { name: string, icon?: string, onClick?: () => void }) {
  return (
    <Card>
      <CardActionArea onClick={onClick}>
        <CardContent>
          <Box display="flex" alignItems="center">
            <Avatar sx={{ mr: 2 }}>{icon ? icon[0].toUpperCase() : '?'}</Avatar>
            <Typography variant="h6">{name}</Typography>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  )
}
